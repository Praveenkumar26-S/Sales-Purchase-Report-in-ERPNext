import frappe
import json
from frappe.utils import flt, nowdate
from erpnext.controllers.accounts_controller import update_child_qty_rate

def execute(filters=None):  
    voucher_type = filters.get("voucher_type")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    rows = get_sales_rows(voucher_type, from_date, to_date, filters)

    columns = [
        {"label": "Voucher Type", "fieldname": "voucher_type", "fieldtype": "Data", "width": 120},
        {"label": "Voucher No", "fieldname": "voucher_no", "fieldtype": "Link", "options": voucher_type, "width": 150},
        {"label": "Party", "fieldname": "party", "fieldtype": "Data", "width": 80},
        {"label": "Party Group", "fieldname": "party_group", "fieldtype": "Data", "width": 120},
        {"label": "Posting Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 120},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
        {"label": "Total Amount", "fieldname": "total_amount", "fieldtype": "Currency", "width": 120},
        {"label": "Outstanding Amount", "fieldname": "outstanding_amount", "fieldtype": "Currency", "width": 120},
        {"label": "Actions", "fieldname": "actions", "fieldtype": "Data", "width": 150},
        {"label": "View Items", "fieldname": "view_items", "fieldtype": "Data", "width": 100},
    ]
    
    for row in rows:
        row.update({
            "voucher_type": voucher_type,
            "outstanding_amount": row.get("outstanding_amount", 0),
            "actions": row.get("actions",""),
            "view_items": row.get("view_items","")
        })

    return columns, rows

def get_sales_rows(voucher_type, from_date, to_date, filters):
    date_fields = {
        "Sales Order": "transaction_date",
        "Sales Invoice": "posting_date",
        "Delivery Note": "posting_date",
        "Purchase Order": "transaction_date",
        "Purchase Invoice": "posting_date",
        "Purchase Receipt": "posting_date"
    }

    party_fields = {
        "Sales Order": ("customer", "customer_group", "Customer"),
        "Sales Invoice": ("customer", "customer_group", "Customer"),
        "Delivery Note": ("customer", "customer_group", "Customer"),
        "Purchase Order": ("supplier", "supplier_group", "Supplier"),
        "Purchase Invoice": ("supplier", "supplier_group", "Supplier"),
        "Purchase Receipt": ("supplier", "supplier_group", "Supplier")
    }

    outstanding_field_map = {
        "Sales Invoice": "outstanding_amount",
        "Purchase Invoice": "outstanding_amount"
    }

    alias_map = {
        "Sales Order": "so",
        "Sales Invoice": "si",
        "Delivery Note": "dn",
        "Purchase Order": "po",
        "Purchase Invoice": "pi",
        "Purchase Receipt": "pr"    
    }

    date_field = date_fields[voucher_type]
    party_field, party_group_field, party_table = party_fields[voucher_type]
    outstanding_field = outstanding_field_map.get(voucher_type, "0")
    alias = alias_map[voucher_type]

    conditions = [f"{alias}.docstatus < 2"]

    if voucher_type == "Sales Order":
        conditions.append(f"{alias}.per_delivered < 100")
        conditions.append(f"{alias}.per_billed < 100")
    elif voucher_type == "Purchase Order":
        conditions.append(f"{alias}.per_received < 100")
        conditions.append(f"{alias}.per_billed < 100")
    elif voucher_type in ["Sales Invoice", "Purchase Invoice"]:
        conditions.append(f"{alias}.outstanding_amount > 0")
    elif voucher_type in ["Delivery Note", "Purchase Receipt"]:
        conditions.append(f"{alias}.status != 'Completed'")

    values = {}

    if from_date:
        conditions.append(f"{alias}.{date_field} >= %(from_date)s")
        values["from_date"] = from_date
    if to_date:
        conditions.append(f"{alias}.{date_field} <= %(to_date)s")
        values["to_date"] = to_date
    if filters.get("status"):
        conditions.append(f"{alias}.status = %(status)s")
        values["status"] = filters["status"]
    if filters.get("customer") and party_field == "customer":
        conditions.append(f"{alias}.customer = %(customer)s")
        values["customer"] = filters["customer"]
    if filters.get("customer_group") and party_group_field == "customer_group":
        conditions.append(f"{party_table.lower()}.{party_group_field} = %(customer_group)s")
        values["customer_group"] = filters["customer_group"]
    if filters.get("supplier") and party_field == "supplier":
        conditions.append(f"{alias}.supplier = %(supplier)s")
        values["supplier"] = filters["supplier"]
    if filters.get("supplier_group") and party_group_field == "supplier_group":
        conditions.append(f"{party_table.lower()}.{party_group_field} = %(supplier_group)s")
        values["supplier_group"] = filters["supplier_group"]

    condition_str = " AND ".join(conditions)

    query = f"""
        SELECT
            {alias}.name AS voucher_no,
            {alias}.{party_field} AS party,
            {party_table.lower()}.{party_group_field} AS party_group,
            {alias}.{date_field} AS posting_date,
            {alias}.status,
            {alias}.rounded_total AS total_amount,
            {outstanding_field} AS outstanding_amount,
            '' AS actions,
            '' AS view_items
        FROM `tab{voucher_type}` {alias}
        LEFT JOIN `tab{party_table}` {party_table.lower()}
            ON {alias}.{party_field} = {party_table.lower()}.name
        WHERE {condition_str}
        ORDER BY {alias}.{date_field} DESC
    """

    return frappe.db.sql(query, values, as_dict=True)

@frappe.whitelist()
def get_items(voucher_type, voucher_no):
    if voucher_type == "Sales Order":
        items = frappe.get_all("Sales Order Item",
            filters={"parent": voucher_no},
            fields=["item_code", "item_name", "qty as total_qty", "rate", "amount", "delivered_qty"])
        for item in items:
            item["pending_qty"] = item["total_qty"] - item.get("delivered_qty", 0)
    elif voucher_type == "Sales Invoice":
        items = frappe.get_all("Sales Invoice Item",
            filters={"parent": voucher_no},
            fields=["item_code", "item_name", "qty", "rate", "amount"])
    elif voucher_type == "Delivery Note":
        items = frappe.get_all("Delivery Note Item",
            filters={"parent": voucher_no},
            fields=["item_code", "item_name", "qty", "rate", "amount"])
    elif voucher_type == "Purchase Order":
        items = frappe.get_all("Purchase Order Item",
            filters={"parent": voucher_no},
            fields=["item_code", "item_name", "qty", "rate", "amount", "received_qty"])
        for item in items:
            item["pending_qty"] = item["qty"] - item.get("received_qty", 0)
    elif voucher_type == "Purchase Invoice":
        items = frappe.get_all("Purchase Invoice Item",
            filters={"parent": voucher_no},
            fields=["item_code", "item_name", "qty", "rate", "amount"])
    elif voucher_type == "Purchase Receipt":
        items = frappe.get_all("Purchase Receipt Item",
            filters={"parent": voucher_no},
            fields=["item_code", "item_name", "qty", "rate", "amount"])
    return items

@frappe.whitelist()
def update_sales_purchase_order_items_custom(parent_doctype, trans_items, parent_doctype_name):
    update_child_qty_rate(parent_doctype, trans_items, parent_doctype_name, child_docname="items")
    
# Sales
@frappe.whitelist()
def create_combined_sales_invoice(sales_orders):
    if isinstance(sales_orders, str):
        sales_orders = json.loads(sales_orders)

    so_docs = [frappe.get_doc("Sales Order", so) for so in sales_orders]

    for so in so_docs:
        existing_si = frappe.db.exists({
            "doctype": "Sales Invoice Item",
            "sales_order": so.name,
            "parenttype": "Sales Invoice",
            "parentfield": "items"
        })
        if existing_si:
            frappe.throw(f"Sales Order {so.name} is already invoiced.")

    customers = list(set([so.customer for so in so_docs]))
    if len(customers) > 1:
        frappe.throw("Selected Sales Orders belong to different customers.")
    customer = customers[0]

    invoice = frappe.new_doc("Sales Invoice")
    invoice.customer = customer
    invoice.due_date = nowdate()
    invoice.naming_series = "ACC-SINV-.YYYY.-.#####"

    for so in so_docs:
        for item in so.items:
            pending_qty = flt(item.qty) - flt(item.delivered_qty)
            if pending_qty > 0:
                invoice.append("items", {
                    "item_code": item.item_code,
                    "qty": pending_qty,
                    "rate": item.rate,
                    "uom": item.uom,
                    "warehouse": item.warehouse,
                    "sales_order": so.name,
                    "description": item.description
                })

    if not invoice.items:
        frappe.throw("No pending items found to invoice.")

    invoice.flags.ignore_permissions = True
    invoice.insert()

    frappe.msgprint(f"Created Combined Sales Invoice <b>{invoice.name}</b> for Customer <b>{customer}</b>.")
    return invoice.name


@frappe.whitelist()
def create_combined_payment_entry(sales_invoices):
    if isinstance(sales_invoices, str):
        sales_invoices = json.loads(sales_invoices)

    si_docs = [frappe.get_doc("Sales Invoice", si) for si in sales_invoices]

    customers = list(set([si.customer for si in si_docs]))
    if len(customers) > 1:
        frappe.throw("Selected invoices belong to different customers.")
    customer = customers[0]

    unpaid_invoices = [si for si in si_docs if flt(si.outstanding_amount) > 0]
    if not unpaid_invoices:
        frappe.throw("All selected invoices are already fully paid.")

    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Receive"
    pe.party_type = "Customer"
    pe.party = customer
    pe.posting_date = nowdate()
    pe.mode_of_payment = "Cash"
    pe.company = unpaid_invoices[0].company
    pe.paid_to = frappe.db.get_value("Company", pe.company, "default_cash_account")

    pe.received_amount = 0
    pe.paid_amount = 0

    for si in unpaid_invoices:
        amount = flt(si.outstanding_amount)
        pe.append("references", {
            "reference_doctype": "Sales Invoice",
            "reference_name": si.name,
            "due_date": si.due_date,
            "total_amount": si.grand_total,
            "outstanding_amount": si.outstanding_amount,
            "allocated_amount": amount
        })
        pe.received_amount += amount
        pe.paid_amount += amount

    pe.flags.ignore_permissions = True
    pe.insert()

    frappe.msgprint(f"Created Combined Payment Entry <b>{pe.name}</b> for Customer <b>{customer}</b>.")
    return pe.name

# Purchase
@frappe.whitelist()
def create_combined_purchase_invoice(purchase_orders):
    if isinstance(purchase_orders, str):
        purchase_orders = json.loads(purchase_orders)

    po_docs = [frappe.get_doc("Purchase Order", po) for po in purchase_orders]

    for po in po_docs:
        existing_pi = frappe.db.exists({
            "doctype": "Purchase Invoice Item",
            "purchase_order": po.name,
            "parenttype": "Purchase Invoice",
            "parentfield": "items"
        })
        if existing_pi:
            frappe.throw(f"Purchase Order {po.name} is already invoiced.")

    suppliers = list(set([po.supplier for po in po_docs]))
    if len(suppliers) > 1:
        frappe.throw("Selected Purchase Orders belong to different suppliers.")
    supplier = suppliers[0]

    invoice = frappe.new_doc("Purchase Invoice")
    invoice.supplier = supplier
    invoice.due_date = nowdate()
    invoice.naming_series = "ACC-PINV-.YYYY.-.#####"

    for po in po_docs:
        for item in po.items:
            pending_qty = flt(item.qty) - flt(item.received_qty)
            if pending_qty > 0:
                invoice.append("items", {
                    "item_code": item.item_code,
                    "qty": pending_qty,
                    "rate": item.rate,
                    "uom": item.uom,
                    "warehouse": item.warehouse,
                    "purchase_order": po.name,
                    "description": item.description
                })

    if not invoice.items:
        frappe.throw("No pending items found to bill.")

    invoice.flags.ignore_permissions = True
    invoice.insert()

    frappe.msgprint(f"Created Combined Purchase Invoice <b>{invoice.name}</b> for Supplier <b>{supplier}</b>.")
    return invoice.name


@frappe.whitelist()
def create_combined_purchase_payment_entry(purchase_invoices):
    if isinstance(purchase_invoices, str):
        purchase_invoices = json.loads(purchase_invoices)

    pi_docs = [frappe.get_doc("Purchase Invoice", pi) for pi in purchase_invoices]

    suppliers = list(set([pi.supplier for pi in pi_docs]))
    if len(suppliers) > 1:
        frappe.throw("Selected invoices belong to different suppliers.")
    supplier = suppliers[0]

    unpaid_invoices = [pi for pi in pi_docs if flt(pi.outstanding_amount) > 0]
    if not unpaid_invoices:
        frappe.throw("All selected invoices are already paid.")

    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Pay"
    pe.party_type = "Supplier"
    pe.party = supplier
    pe.posting_date = nowdate()
    pe.mode_of_payment = "Cash"
    pe.company = unpaid_invoices[0].company
    pe.paid_from = frappe.db.get_value("Company", pe.company, "default_cash_account")

    pe.paid_amount = 0
    pe.received_amount = 0

    for pi in unpaid_invoices:
        amount = flt(pi.outstanding_amount)
        pe.append("references", {
            "reference_doctype": "Purchase Invoice",
            "reference_name": pi.name,
            "due_date": pi.due_date,
            "total_amount": pi.grand_total,
            "outstanding_amount": pi.outstanding_amount,
            "allocated_amount": min(amount, flt(pi.outstanding_amount, 2))
        })
        pe.paid_amount += amount
        pe.received_amount += amount

    pe.flags.ignore_permissions = True
    pe.insert()

    frappe.msgprint(f"Created Combined Payment Entry <b>{pe.name}</b> for Supplier <b>{supplier}</b>.")
    return pe.name

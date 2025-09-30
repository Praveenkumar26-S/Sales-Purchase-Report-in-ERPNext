import frappe
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
        {"label": "Actions", "fieldname": "actions", "fieldtype": "Data", "width": 180},
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
    values = {}

    if from_date:
        conditions.append(f"{alias}.{date_field} >= %(from_date)s")
        values["from_date"] = from_date
    if to_date:
        conditions.append(f"{alias}.{date_field} <= %(to_date)s")
        values["to_date"] = to_date
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
def update_salesorder_items_custom(parent_doctype, trans_items, parent_doctype_name):
    update_child_qty_rate(parent_doctype, trans_items, parent_doctype_name, child_docname="items")
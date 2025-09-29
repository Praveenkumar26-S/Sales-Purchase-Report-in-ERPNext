# Copyright (c) 2025, PK and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.utils import flt
def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

#Data Column
def get_columns():
    return [
        {"label": "Voucher No", "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 180},
        {"label": "Voucher Type", "fieldname": "voucher_type", "fieldtype": "Data", "width": 120},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 120},
        {"label": "Party", "fieldname": "party", "fieldtype": "Data", "width": 50},
        {"label": "Party Group", "fieldname": "party_group", "fieldtype": "Data", "width": 120},
        {"label": "Amount", "fieldname": "amount", "fieldtype": "Currency", "width": 120},
        {"label": "Outstanding Amount", "fieldname": "outstanding_amount", "fieldtype": "Currency", "width": 120},
        {"label": "Actions", "fieldname": "actions", "fieldtype": "Data", "width": 150},
        {"label": "View Items", "fieldname": "view_items", "fieldtype": "Data", "width": 120},
    ]
#Report Filters
def get_data(filters):
    if not filters.get("voucher_type"):
        return []

    date_fields = {
        "Sales Order": "transaction_date",
        "Purchase Order": "transaction_date",
        "Sales Invoice": "posting_date",
        "Purchase Invoice": "posting_date",
        "Delivery Note": "posting_date",
        "Purchase Receipt": "posting_date",
    }

    party_fields = {
        "Sales Order": ("customer", "customer_group", "Customer"),
        "Sales Invoice": ("customer", "customer_group", "Customer"),
        "Delivery Note": ("customer", "customer_group", "Customer"),
        "Purchase Order": ("supplier", "supplier_group", "Supplier"),
        "Purchase Invoice": ("supplier", "supplier_group", "Supplier"),
        "Purchase Receipt": ("supplier", "supplier_group", "Supplier"),
    }

    outstanding_field_map = {
        "Sales Invoice": "outstanding_amount",
        "Purchase Invoice": "outstanding_amount"
    }

    doctype = filters.get("voucher_type")
    date_field = date_fields[doctype]
    party_field, party_group_field, party_table = party_fields[doctype]
    outstanding_field = outstanding_field_map.get(doctype, "0")

    alias_map = {
        "Sales Order": "so",
        "Purchase Order": "po",
        "Sales Invoice": "si",
        "Purchase Invoice": "pi",
        "Delivery Note": "dn",
        "Purchase Receipt": "pr",
    }
    alias = alias_map[doctype]

    conditions = []
    values = {}

    if filters.get("from_date") and filters.get("to_date"):
        conditions.append(f"{alias}.{date_field} BETWEEN %(from_date)s AND %(to_date)s")
        values["from_date"] = filters["from_date"]
        values["to_date"] = filters["to_date"]

    if filters.get("status"):
        conditions.append(f"{alias}.status = %(status)s")
        values["status"] = filters["status"]

    if filters.get("customer") and party_field == "customer":
        conditions.append(f"{alias}.customer = %(customer)s")
        values["customer"] = filters["customer"]

    if filters.get("supplier") and party_field == "supplier":
        conditions.append(f"{alias}.supplier = %(supplier)s")
        values["supplier"] = filters["supplier"]

    if filters.get("customer_group") and party_group_field == "customer_group":
        conditions.append(f"{party_table.lower()}.{party_group_field} = %(customer_group)s")
        values["customer_group"] = filters["customer_group"]

    if filters.get("supplier_group") and party_group_field == "supplier_group":
        conditions.append(f"{party_table.lower()}.{party_group_field} = %(supplier_group)s")
        values["supplier_group"] = filters["supplier_group"]

    condition_str = " AND ".join(conditions) if conditions else "1=1"

    query = f"""
        SELECT 
            {alias}.name as voucher_no,
            '{doctype}' as voucher_type,
            {alias}.status,
            {alias}.{date_field} as date,
            {alias}.{party_field} as party,
            {party_table.lower()}.{party_group_field} as party_group,
            {alias}.grand_total as amount,
            {outstanding_field} as outstanding_amount,
            '' as actions,
            '' as view_items
        FROM `tab{doctype}` {alias}
        LEFT JOIN `tab{party_table}` {party_table.lower()}
            ON {alias}.{party_field} = {party_table.lower()}.name
        WHERE {condition_str}
        ORDER BY {alias}.{date_field} DESC
    """
    
    return frappe.db.sql(query, values, as_dict=True)

#Update Function
@frappe.whitelist()
def get_voucher_items(voucher_type, voucher_no):
    doc = frappe.get_doc(voucher_type, voucher_no)

    return {
        "items": [
            {
                "name": d.name,
                "item_code": d.item_code,
                "item_name": d.item_name,
                "description": d.description,
                "qty": d.qty,
                "uom": d.uom,
                "conversion_factor": d.conversion_factor,
                "rate": d.rate,
                "amount": d.amount
            }
            for d in doc.items
        ]
    }

@frappe.whitelist()
def update_voucher_items(voucher_type, voucher_no, items):
    doc = frappe.get_doc(voucher_type, voucher_no)

    items_list = json.loads(items)
    for i in items_list:
        if not i.get("name"):
            continue  

        frappe.db.set_value("Sales Order Item", i["name"], "qty", i.get("qty"))
        frappe.db.set_value("Sales Order Item", i["name"], "rate", i.get("rate"))
        frappe.db.set_value("Sales Order Item", i["name"], "amount", (i.get("qty") or 0) * (i.get("rate") or 0))
        
        frappe.db.set_value("Purchase Order Item", i["name"], "qty", i.get("qty"))
        frappe.db.set_value("Purchase Order Item", i["name"], "rate", i.get("rate"))
        frappe.db.set_value("Purchase Order Item", i["name"], "amount", (i.get("qty") or 0) * (i.get("rate") or 0))
        
        frappe.db.set_value("Sales Invoice Item", i["name"], "qty", i.get("qty"))
        frappe.db.set_value("Sales Invoice Item", i["name"], "rate", i.get("rate"))
        frappe.db.set_value("Sales Invoice Item", i["name"], "amount", (i.get("qty") or 0) * (i.get("rate") or 0))
        
        frappe.db.set_value("Purchase Invoice Item", i["name"], "qty", i.get("qty"))
        frappe.db.set_value("Purchase Invoice Item", i["name"], "rate", i.get("rate"))
        frappe.db.set_value("Purchase Invoice Item", i["name"], "amount", (i.get("qty") or 0) * (i.get("rate") or 0))
        
        total = (i.get("qty") or 0) * (i.get("rate") or 0)
        frappe.db.set_value(voucher_type, voucher_no, "total", total)
        frappe.db.set_value(voucher_type, voucher_no, "total_qty", i.get("qty"))
        frappe.db.set_value(voucher_type, voucher_no, "grand_total", total)
        frappe.db.set_value(voucher_type, voucher_no, "rounded_total", round(total))
        if voucher_type in ("Sales Invoice", "Purchase Invoice"):
            doc = frappe.get_doc(voucher_type, voucher_no)
            total_paid = frappe.db.sql(
                """ SELECT SUM(allocated_amount) FROM `tabPayment Entry Reference` WHERE reference_doctype = %s AND reference_name = %s""", (voucher_type, voucher_no),)[0][0] or 0
            outstanding_amount = (doc.grand_total) - total_paid
            frappe.db.set_value(voucher_type, voucher_no, "outstanding_amount", outstanding_amount)
        # if voucher_type == "Sales Invoice":
        #     doc = frappe.get_doc(voucher_type, voucher_no)
        #     total_paid = frappe.db.sql(
        #         """ SELECT SUM(allocated_amount)
        #         FROM `tabPayment Entry Reference`
        #         WHERE reference_doctype = %s
        #         AND reference_name = %s""", ("Sales Invoice", voucher_no),
        #     )[0][0] or 0
        #     outstanding_amount = (doc.grand_total) - total_paid
        #     frappe.db.set_value(voucher_type, voucher_no, "outstanding_amount", outstanding_amount)

    doc = frappe.get_doc(voucher_type, voucher_no)
    doc.save(ignore_permissions=True)

    return {"message": f"{voucher_type} {voucher_no} items updated successfully"}


#View Function
@frappe.whitelist()
def view_items(voucher_no, voucher_type):
    items = frappe.db.get_all(
        f"{voucher_type} Item",
        filters={"parent": voucher_no},
        fields=["item_code", "item_name", "qty", "rate", "amount"]
    )
    return frappe.render_template("""
        <table class="table table-bordered">
            <tr><th>Item Code</th><th>Item Name</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
            {% for i in items %}
                <tr>
                    <td>{{ i.item_code }}</td>
                    <td>{{ i.item_name }}</td>
                    <td>{{ i.qty }}</td>
                    <td>{{ i.rate }}</td>
                    <td>{{ i.amount }}</td>
                </tr>
            {% endfor %}
        </table>
    """, {"items": items})

#Create Function
@frappe.whitelist()
def create_entry(voucher_no, voucher_type, target=None):    
    try:
        doc = None

        if voucher_type == "Sales Order":
            so = frappe.get_doc("Sales Order", voucher_no)
            
            if target == "Sales Invoice":
                doc = frappe.new_doc("Sales Invoice")
                doc.customer = so.customer
                doc.company = so.company
                doc.due_date = so.delivery_date
                doc.update_stock = 0  
                
                for d in so.items:
                    doc.append("items", {
                        "item_code": d.item_code,
                        "item_name": d.item_name,
                        "qty": d.qty,          
                        "rate": d.rate,
                        "amount": d.amount,
                        "sales_order": so.name
                    })
                    
            elif target == "Delivery Note":
                doc = frappe.new_doc("Delivery Note")
                doc.customer = so.customer
                doc.company = so.company
                doc.posting_date = frappe.utils.today()
                
                for d in so.items:
                    doc.append("items", {
                        "item_code": d.item_code,
                        "item_name": d.item_name,
                        "qty": d.qty,
                        "rate": d.rate,
                        "sales_order": so.name
                    })
                    
        elif voucher_type == "Purchase Order":
            po = frappe.get_doc("Purchase Order", voucher_no)
            
            if target == "Purchase Invoice":
                doc = frappe.new_doc("Purchase Invoice")
                doc.supplier = po.supplier
                doc.company = po.company
                doc.due_date = po.schedule_date
                
                for d in po.items:
                    doc.append("items", {
                        "item_code": d.item_code,
                        "item_name": d.item_name,
                        "qty": d.qty,
                        "rate": d.rate,
                        "amount": d.amount,
                        "purchase_order": po.name
                    })
                    
            elif target == "Purchase Receipt":
                doc = frappe.new_doc("Purchase Receipt")
                doc.supplier = po.supplier
                doc.company = po.company
                doc.posting_date = frappe.utils.today()
                
                for d in po.items:
                    doc.append("items", {
                        "item_code": d.item_code,
                        "item_name": d.item_name,
                        "qty": d.qty,
                        "rate": d.rate,
                        "purchase_order": po.name
                    })
                    
        elif voucher_type == "Sales Invoice" and target == "Delivery Note":
            si = frappe.get_doc("Sales Invoice", voucher_no)
            doc = frappe.new_doc("Delivery Note")
            doc.customer = si.customer
            doc.company = si.company
            doc.posting_date = frappe.utils.today()
            for d in si.items:
                doc.append("items", {
                    "item_code": d.item_code,
                    "item_name": d.item_name,
                    "qty": d.qty,
                    "rate": d.rate,
                    "sales_invoice": si.name
                })
                
        elif voucher_type == "Purchase Invoice" and target == "Purchase Receipt":
            pi = frappe.get_doc("Purchase Invoice", voucher_no)
            doc = frappe.new_doc("Purchase Receipt")
            doc.supplier = pi.supplier
            doc.company = pi.company
            doc.posting_date = frappe.utils.today()
            for d in pi.items:
                doc.append("items", {
                    "item_code": d.item_code,
                    "item_name": d.item_name,
                    "qty": d.qty,
                    "rate": d.rate,
                    "purchase_invoice": pi.name
                })
                
        if not doc:
            return f"No mapping found for this action: {voucher_type} → {target}"
        
        if not doc.items:
            frappe.throw(f"No items found to create {target} from {voucher_type} {voucher_no}")
            
        doc.insert(ignore_permissions=True)
        doc.submit()
        
        return f"{doc.doctype} <b>{doc.name}</b> created successfully from {voucher_type} {voucher_no}"
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Unified Report Create Entry")
        return f"Error creating {target} from {voucher_type} {voucher_no}: {str(e)}"    

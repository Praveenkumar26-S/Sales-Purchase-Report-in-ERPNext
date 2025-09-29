import frappe
from erpnext.controllers.accounts_controller import update_child_qty_rate

VOUCHER_MAP = {
    "Sales Order": "Sales Order",
    "Sales Invoice": "Sales Invoice",
    "Delivery Note": "Delivery Note",
}

def execute(filters=None):  
    filters = filters
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
        row["voucher_type"] = voucher_type
        if "outstanding_amount" not in row:
            row["outstanding_amount"] = 0
        if "actions" not in row:
            row["actions"] = ""
        if "view_items" not in row:
            row["view_items"] = ""

    return columns, rows

def get_sales_rows(voucher_type, from_date, to_date, filters):
    conditions = ["docstatus < 2"]
    values = {}

    date_field = "posting_date"
    if voucher_type == "Sales Order":
        date_field = "transaction_date"

    if from_date:
        conditions.append(f"{date_field} >= %(from_date)s")
        values["from_date"] = from_date
    if to_date:
        conditions.append(f"{date_field} <= %(to_date)s")
        values["to_date"] = to_date
    if filters.get("customer"):
        conditions.append("customer = %(customer)s")
        values["customer"] = filters.get("customer")
    if filters.get("status"):
        conditions.append("status = %(status)s")
        values["status"] = filters.get("status")

    if filters.get("customer_group"):
        conditions.append("customer_group = %(customer_group)s")
        values["customer_group"] = filters.get("customer_group")


    condition_str = " AND ".join(conditions)

    if voucher_type == "Sales Order":
        query = f"""
            SELECT
                name AS voucher_no,
                customer AS party,
                customer_group AS party_group,
                transaction_date AS posting_date,
                status,
                rounded_total AS total_amount
            FROM `tabSales Order`
            WHERE {condition_str}
            ORDER BY transaction_date DESC
        """
    elif voucher_type == "Sales Invoice":
        query = f"""
            SELECT
                name AS voucher_no,
                customer AS party,
                customer_group AS party_group,
                posting_date,
                status,
                rounded_total AS total_amount,
                outstanding_amount
            FROM `tabSales Invoice`
            WHERE {condition_str}
            ORDER BY posting_date DESC
        """
    elif voucher_type == "Delivery Note":
        query = f"""
            SELECT
                name AS voucher_no,
                customer AS party,
                customer_group AS party_group,
                posting_date,
                status,
                rounded_total AS total_amount
            FROM `tabDelivery Note`
            WHERE {condition_str}
            ORDER BY posting_date DESC
        """

    rows = frappe.db.sql(query, values, as_dict=True)

    for row in rows:
        row["actions"] = ""
        row["view_items"] = ""

    return rows
    

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
    return items

@frappe.whitelist()
def update_salesorder_items_custom(parent_doctype, trans_items, parent_doctype_name):
    update_child_qty_rate(parent_doctype, trans_items, parent_doctype_name, child_docname="items")
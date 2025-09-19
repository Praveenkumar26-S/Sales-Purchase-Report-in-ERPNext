# Copyright (c) 2025, PK and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


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


@frappe.whitelist()
def update_entry(voucher_no, voucher_type):
    return f"Update logic for {voucher_type} - {voucher_no}"

@frappe.whitelist()
def create_entry(voucher_no, voucher_type):
    return f"Create logic for {voucher_type} - {voucher_no}"

@frappe.whitelist()
def get_items(voucher_no, voucher_type):
    items = frappe.db.get_all(
        f"{voucher_type} Item",
        filters={"parent": voucher_no},
        fields=["item_code", "item_name", "qty", "rate", "amount"]
    )
    return frappe.render_template("""
        <table class="table table-bordered">
            <tr><th>Item Code</th><th>Item Name</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
            {% for i in items %}
                <tr><td>{{ i.item_code }}</td><td>{{ i.item_name }}</td><td>{{ i.qty }}</td><td>{{ i.rate }}</td><td>{{ i.amount }}</td></tr>
            {% endfor %}
        </table>
    """, {"items": items})

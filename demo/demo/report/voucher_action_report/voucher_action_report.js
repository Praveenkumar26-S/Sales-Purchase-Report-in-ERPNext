frappe.query_reports["Voucher Action Report"] = {
    "filters": [
        {
            "fieldname":"from_date",
            "label": __("From Date"),
            "fieldtype": "Date"
        },
        {
            "fieldname":"to_date",
            "label": __("To Date"),
            "fieldtype": "Date"
        },
        {
            "fieldname":"voucher_type",
            "label": __("Voucher Type"),
            "fieldtype": "Select",
            "options": ["Sales Order", "Sales Invoice", "Delivery Note"]
        },
        {
            "fieldname":"customer",
            "label": __("Customer"),
            "fieldtype": "Link",
            "options": "Customer"
        },
        {
            "fieldname":"customer_group",
            "label": __("Customer Group"),
            "fieldtype": "Link",
            "options": "Customer Group"
        }
    ],
    onload: function(report) {
        report.page.add_inner_button(__('Refresh'), function() {
            report.refresh();
        });
    },
    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "actions") {
            let voucher_no = data.voucher_no;
            let voucher_type = data.voucher_type;
            let update_btn = `<button class="btn btn-xs btn-secondary" onclick="custom_update_voucher('${voucher_no}', '${voucher_type}')">Update</button>`;
            let create_btn = `<button class="btn btn-xs btn-success" onclick="create_voucher('${voucher_no}', '${voucher_type}')">Create</button>`;
            return `${update_btn} ${create_btn}`;
        }

        if(column.fieldname === "view_items") {
            return `<button class="btn btn-xs btn-info" onclick="view_items_dialog('${data.voucher_type}', '${data.voucher_no}')">View</button>`;
        }

        return value;
    }
};

function custom_update_voucher(voucher_no, voucher_type) {
    if(voucher_type === "Sales Order") {
        $.when(
            frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Sales Order", name: voucher_no }
            }),
            frappe.db.get_doc("DocType", "Sales Order Item")
        ).then(function(sales_order_res, sales_order_item_doc) {
            let sales_order = sales_order_res[0].message;
            let fields = [];

            sales_order_item_doc.fields.forEach(function(df) {
                if(["parent", "idx", "docstatus"].indexOf(df.fieldname) === -1) {
                    fields.push({
                        fieldtype: df.fieldtype,
                        fieldname: df.fieldname,
                        label: df.label,
                        options: df.options,
                        read_only: df.read_only,
                        reqd: df.reqd,
                        precision: df.precision,
                        in_list_view: df.in_list_view
                    });
                }
            });

            fields.push({ fieldtype: 'Data', fieldname: 'docname', label: 'Docname', hidden: 1 });

            let items_data = sales_order.items.map(function(item) {
                let obj = {};
                fields.forEach(function(field) {
                    obj[field.fieldname] = item[field.fieldname];
                });
                obj["docname"] = item.name;
                return obj;
            });

            let dialog = new frappe.ui.Dialog({
                title: __("Update Items for " + voucher_no),
                fields: [
                    {
                        fieldtype: 'Table',
                        fieldname: 'items',
                        label: __("Items"),
                        data: items_data,
                        fields: fields,
                        cannot_add_rows: false,
                        in_place_edit: true
                    }
                ],
                primary_action_label: __("Update"),
                primary_action(values) {
                    frappe.call({
                        method: "demo.demo.report.voucher_action_report.voucher_action_report.update_salesorder_items_custom",
                        args: {
                            parent_doctype: "Sales Order",
                            trans_items: JSON.stringify(values.items),
                            parent_doctype_name: voucher_no
                        },
                        callback: function(resp) {
                            if (!resp.exc) {
                                frappe.msgprint(__("Sales Order items updated."));
                                dialog.hide();
                                frappe.query_report.refresh();
                            } else {
                                frappe.msgprint(__("Items update failed."));
                            }
                        }
                    });
                }
            });
            dialog.show();
        });
    } else {
        frappe.set_route("Form", voucher_type, voucher_no);
    }
}

function view_items_dialog(voucher_type, voucher_no) {
    frappe.call({
        method: "demo.demo.report.voucher_action_report.voucher_action_report.get_items",
        args: {voucher_type, voucher_no},
        callback: function(r) {
            if(r.message) {
                let dialog = new frappe.ui.Dialog({
                    title: __('Items of {0}', [voucher_no]),
                    fields: [
                        {fieldtype: 'HTML', fieldname: 'items_html'}
                    ]
                });

                let html = `<table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Item Code</th>	
                            <th>Item Name</th>
                            <th>Qty</th>
                            <th>Rate</th>
							<th>Amount</th>
                            <th>Delivered Qty</th>
						
                        </tr>
                    </thead>
                    <tbody>`;
                r.message.forEach(item => {
                    html += `<tr>
                        <td>${item.item_code}</td>
                        <td>${item.item_name}</td>
                        <td>${item.qty}</td>
                        <td>${item.rate}</td>
						<td>${item.amount}</td>
                        <td>${item.delivered_qty || item.received_qty || 0}</td>
                    </tr>`;
                });
                html += "</tbody></table>";
                dialog.fields_dict.items_html.$wrapper.html(html);
                dialog.show();
            }
        }
    });
}

function create_voucher(voucher_no, voucher_type) {
    if(voucher_type === "Sales Order") {
        frappe.new_doc("Sales Invoice", {sales_order: voucher_no});
    } else if(voucher_type === "Sales Invoice") {
        frappe.new_doc("Payment Entry", {reference_name: voucher_no});
    } else if(voucher_type === "Delivery Note") {
        frappe.new_doc("Sales Invoice", {delivery_note: voucher_no});
    }
}
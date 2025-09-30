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
            "options": ["Sales Order", "Sales Invoice", "Delivery Note", "Purchase Order", "Purchase Invoice", "Purchase Receipt"] 
        },
		{
			"fieldname":"status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": [ "","Draft","To Deliver and Bill","To Bill","To Deliver","Completed","Cancelled","Overdue","To Receive and Bill", "To Receive", "To Bill", "Closed"]
		},
        {
            "fieldname":"customer",
            "label": __("Customer"),
            "fieldtype": "Link",
            "options": "Customer",
            "depends_on": "eval:in_list(['Sales Order','Sales Invoice','Delivery Note'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            "fieldname":"customer_group",
            "label": __("Customer Group"),
            "fieldtype": "Link",
            "options": "Customer Group",
            "depends_on": "eval:in_list(['Sales Order','Sales Invoice','Delivery Note'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            "fieldname":"supplier",
            "label": __("Supplier"),
            "fieldtype": "Link",
            "options": "Supplier",
            "depends_on": "eval:in_list(['Purchase Order','Purchase Invoice','Purchase Receipt'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            "fieldname":"supplier_group",
            "label": __("Supplier Group"),
            "fieldtype": "Link",
            "options": "Supplier Group",
            "depends_on": "eval:in_list(['Purchase Order','Purchase Invoice','Purchase Receipt'], frappe.query_report.get_filter_value('voucher_type'))"
        }
    ],

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
    if (voucher_type === "Sales Order") {
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
                if (["parent", "idx", "docstatus"].indexOf(df.fieldname) === -1) {
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

                let html = `<table class="table table-bordered"><thead><tr>`;

                if (voucher_type === "Sales Order") {
                    html += `
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th>Total Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                        <th>Delivered Qty</th>
                        <th>Pending Qty</th>`;
                } else {
                    html += `
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>`;
                }

                html += `</tr></thead><tbody>`;

                r.message.forEach(item => {
                    html += `<tr>
                        <td>${item.item_code}</td>
                        <td>${item.item_name}</td>`;

                    if (voucher_type === "Sales Order") {
                        html += `
                            <td>${item.total_qty}</td>
                            <td>${item.rate}</td>
                            <td>${item.amount}</td>
                            <td>${item.delivered_qty || 0}</td>
                            <td>${item.pending_qty || (item.total_qty - (item.delivered_qty || 0)) || 0}</td>`;
                    } else {
                        html += `
                            <td>${item.qty}</td>
                            <td>${item.rate}</td>
                            <td>${item.amount}</td>`;
                    }

                    html += `</tr>`;
                });

                html += `</tbody></table>`;
                dialog.fields_dict.items_html.$wrapper.html(html);
                dialog.show();
            }
        }
    });
}
// Sales
function create_sales_invoice_from_so(voucher_no) {
    frappe.call({
        method: "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
        args: {
            source_name: voucher_no
        },
        callback: function(r) {
            if(r.message) {
                frappe.model.with_doctype("Sales Invoice", function() {
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Sales Invoice", doc.name); 
                });
            }
        }
    });
}

function create_delivery_note_from_so(voucher_no) {
    frappe.call({
        method: "erpnext.selling.doctype.sales_order.sales_order.make_delivery_note",
        args: {
            source_name: voucher_no
        },
        callback: function(r) {
            if(r.message) {
                frappe.model.with_doctype("Delivery Note", function() {
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Delivery Note", doc.name);
                });
            }
        }
    });
}

function create_payment_entry_from_si(voucher_no) {
    frappe.call({
		method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
        args: { dt: "Sales Invoice", dn: voucher_no },
        callback: function(r) {
            if(r.message) {
                frappe.model.with_doctype("Payment Entry", function() {
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Payment Entry", doc.name);
                });
            }
        }
    });
}

function create_delivery_note_from_si(voucher_no) {
    frappe.call({
        method: "erpnext.accounts.doctype.sales_invoice.sales_invoice.make_delivery_note",
        args: { source_name: voucher_no },
        callback: function(r) {
            if(r.message) {
                frappe.model.with_doctype("Delivery Note", function() {
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Delivery Note", doc.name);
                });
            }
        }
    });
}

function create_sales_invoice_from_dn(voucher_no) {
    frappe.call({
        method: "erpnext.stock.doctype.delivery_note.delivery_note.make_sales_invoice",
        args: { source_name: voucher_no },
        callback: function(r) {
            if(r.message) {
                frappe.model.with_doctype("Sales Invoice", function() {
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Sales Invoice", doc.name);
                });
            }
        }
    });
}
// Purchase
function create_purchase_invoice_from_po(voucher_no){
    frappe.call({
        method: "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_invoice",
        args: { source_name: voucher_no},
        callback: function(r){
            if (r.message){
                frappe.model.with_doctype("Purchase Invoice", function(){
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Purchase Invoice", doc.name);
                });
            }
        }
    });
}

function create_purchase_receipt_from_po(voucher_no){
    frappe.call({
        method: "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt",
        args: { source_name: voucher_no},
        callback: function(r){
            if (r.message){
                frappe.model.with_doctype("Purchase Receipt", function(){
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Purchase Receipt", doc.name);
                });
            }
        }
    });
}

function create_purchase_receipt_from_pi(voucher_no) {
    frappe.call({
        method: "erpnext.accounts.doctype.purchase_invoice.purchase_invoice.make_purchase_receipt",
        args: { source_name: voucher_no },
        callback: function(r) {
            if (r.message) {
                frappe.model.with_doctype("Purchase Receipt", function() {
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Purchase Receipt", doc.name);
                });
            }
        }
    });
}

function create_payment_entry_from_pi(voucher_no){
    frappe.call({
        method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
        args:{ dt: "Purchase Invoice", dn: voucher_no},
        callback: function(r){
            if(r.message){
                frappe.model.with_doctype("Payment Entry", function(){
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Payment Entry", doc.name);
                });
            }
        }
    });
}

function create_purchase_invoice_from_pr(voucher_no){
    frappe.call({
        method: "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice",
        args:{source_name: voucher_no},
        callback: function(r){
            if(r.message){
                frappe.model.with_doctype("Purchase Invoice", function(){
                    var doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", "Purchase Invoice", doc.name);
                });
            }
        }
    });
}

function create_voucher(voucher_no, voucher_type) {
    let dialog;
    if (voucher_type === "Sales Order") {
        dialog = new frappe.ui.Dialog({
            title: __("Create for Sales Order"),
            fields: [
                {
                    fieldtype: "Button",
                    label: __("Create Sales Invoice"),
                    click() {
                        create_sales_invoice_from_so(voucher_no);
                        dialog.hide();
                    }
                },
                {
                    fieldtype: "Button",
                    label: __("Create Delivery Note"),
                    click() {
                        create_delivery_note_from_so(voucher_no);
                        dialog.hide();
                    }
                }
            ]
        });
    } else if (voucher_type === "Sales Invoice") {
        dialog = new frappe.ui.Dialog({
            title: __("Create for Sales Invoice"),
            fields: [
                {
                    fieldtype: "Button",
                    label: __("Create Payment Entry"),
                    click() {
                        create_payment_entry_from_si(voucher_no);
                        dialog.hide();
                    }
                },
                {
                    fieldtype: "Button",
                    label: __("Create Delivery Note"),
                    click() {
                        create_delivery_note_from_si(voucher_no);
                        dialog.hide();
                    }
                }
            ]
        });
    } else if (voucher_type === "Delivery Note") {
        dialog = new frappe.ui.Dialog({
            title: __("Create for Delivery Note"),
            fields: [
                {
                    fieldtype: "Button",
                    label: __("Create Sales Invoice"),
                    click() {
                        create_sales_invoice_from_dn(voucher_no);
                        dialog.hide();
                    }
                }
            ]
        });
    } else if (voucher_type === "Purchase Order"){
        dialog = new frappe.ui.Dialog({
            title: __("Create for Purchase Order"),
            fields: [
                {
                    fieldtype:"Button",
                    label: __("Create Purchase Invoice"),
                    click(){
                        create_purchase_invoice_from_po(voucher_no);
                        dialog.hide();
                    }
                },
                {
                    fieldtype:"Button",
                    label: __("Create Purchase Receipt"),
                    click(){
                        create_purchase_receipt_from_po(voucher_no);
                        dialog.hide();
                    }
                }
            ]
        });
    } else if (voucher_type === "Purchase Invoice"){
        dialog = new frappe.ui.Dialog({
            title: __("Create for Purchase Invoice"),
            fields: [
                {
                    fieldtype: "Button",
                    label: __("Create Purchase Receipt"),
                    click(){
                        create_purchase_receipt_from_pi(voucher_no);
                        dialog.hide();
                    }
                },
                {
                    fieldtype: "Button",
                    label: __("Create Payment Entry"),
                    click(){
                        create_payment_entry_from_pi(voucher_no);
                        dialog.hide();
                    }
                }
            ]
        });
    } else if (voucher_type === "Purchase Receipt"){
        dialog = new frappe.ui.Dialog({
            title: __("Create for Purchase Receipt"),
            fields: [
                {
                    fieldtype: "Button",
                    label:__("Create Purchase Invoice"),
                    click(){
                        create_purchase_invoice_from_pr(voucher_no);
                        dialog.hide();
                    }
                }
            ]
        });
    } else {
        frappe.msgprint(__("No create actions for this voucher type"));
        return;
    }
    dialog.show();
}
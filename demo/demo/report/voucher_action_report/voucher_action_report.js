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

    
    onload: function (report) {
        report.page.add_inner_button(__('Create Combined Sales Invoice'), function () {
            console.log("Sales Invoice Button Clicked");
            let selected = report.get_checked_items();

            if (!selected || !selected.length) {
                frappe.msgprint("Please select at least one Sales Order.");
                return;
            }

            let invalid = selected.some(r => r.voucher_type !== "Sales Order");
            if (invalid) {
                frappe.msgprint("You can only create a combined Sales Invoice for Sales Orders.");
                return;
            }

            let sales_orders = selected.map(row => row.voucher_no);
            console.log("Selected Sales Orders:", sales_orders);

            frappe.call({
                method: "demo.demo.report.voucher_action_report.voucher_action_report.create_combined_sales_invoice",
                args: { sales_orders: JSON.stringify(sales_orders) },
                freeze: true,
                freeze_message: __("Creating combined Sales Invoice..."),
                callback: function (r) {
                    if (!r.exc && r.message) {
                        frappe.msgprint(__('Sales Invoice created: {0}', [r.message]));
                        frappe.set_route("Form", "Sales Invoice", r.message);
                    } else {
                        frappe.msgprint(__('Failed to create combined Sales Invoice.'));
                    }
                }
            });
        });

        report.page.add_inner_button(__('Create Combined Sales Payment Entry'), function () {
            console.log("Sales Payment Button Clicked");
            let selected = report.get_checked_items();

            if (!selected || !selected.length) {
                frappe.msgprint("Please select at least one Sales Invoice.");
                return;
            }

            let invalid = selected.some(r => r.voucher_type !== "Sales Invoice");
            if (invalid) {
                frappe.msgprint("You can only create a combined Payment Entry for Sales Invoices.");
                return;
            }

            let invoices = selected.map(row => row.voucher_no);

            frappe.call({
                method: "demo.demo.report.voucher_action_report.voucher_action_report.create_combined_payment_entry",
                args: { sales_invoices: JSON.stringify(invoices) },
                freeze: true,
                freeze_message: __("Creating combined Payment Entry..."),
                callback: function (r) {
                    if (!r.exc && r.message) {
                        frappe.msgprint(__('Payment Entry created: {0}', [r.message]));
                        frappe.set_route("Form", "Payment Entry", r.message);
                    }
                }
            });
        });

        report.page.add_inner_button(__('Create Combined Purchase Invoice'), function () {
            console.log("Purchase Invoice Button Clicked");
            let selected = report.get_checked_items();

            if (!selected || !selected.length) {
                frappe.msgprint("Please select at least one Purchase Order.");
                return;
            }

            let invalid = selected.some(r => r.voucher_type !== "Purchase Order");
            if (invalid) {
                frappe.msgprint("You can only create a combined Purchase Invoice for Purchase Orders.");
                return;
            }

            let purchase_orders = selected.map(row => row.voucher_no);
            console.log("Selected Purchase Orders:", purchase_orders);

            frappe.call({
                method: "demo.demo.report.voucher_action_report.voucher_action_report.create_combined_purchase_invoice",
                args: { purchase_orders: JSON.stringify(purchase_orders) },
                freeze: true,
                freeze_message: __("Creating combined Purchase Invoice..."),
                callback: function (r) {
                    if (!r.exc && r.message) {
                        frappe.msgprint(__('Purchase Invoice created: {0}', [r.message]));
                        frappe.set_route("Form", "Purchase Invoice", r.message);
                    } else {
                        frappe.msgprint(__('Failed to create combined Purchase Invoice.'));
                    }
                }
            });
        });

        report.page.add_inner_button(__('Create Combined Purchase Payment Entry'), function () {
            console.log("Purchase Payment Button Clicked");
            let selected = report.get_checked_items();

            if (!selected || !selected.length) {
                frappe.msgprint("Please select at least one Purchase Invoice.");
                return;
            }

            let invalid = selected.some(r => r.voucher_type !== "Purchase Invoice");
            if (invalid) {
                frappe.msgprint("You can only create a combined Payment Entry for Purchase Invoices.");
                return;
            }

            let purchase_invoices = selected.map(row => row.voucher_no);
            console.log("Selected Purchase Invoices:", purchase_invoices);

            frappe.call({
                method: "demo.demo.report.voucher_action_report.voucher_action_report.create_combined_purchase_payment_entry",
                args: { purchase_invoices: JSON.stringify(purchase_invoices) },
                freeze: true,
                freeze_message: __("Creating combined Purchase Payment Entry..."),
                callback: function (r) {
                    if (!r.exc && r.message) {
                        frappe.msgprint(__('Payment Entry created: {0}', [r.message]));
                        frappe.set_route("Form", "Payment Entry", r.message);
                    } else {
                        frappe.msgprint(__('Failed to create combined Payment Entry.'));
                    }
                }
            });
        });
    },

    get_datatable_options(options) {
        options.checkboxColumn = true;
        return options;
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
    if (voucher_type === "Sales Order" || voucher_type === "Purchase Order") {
        let child_doctype = voucher_type === "Sales Order" ? "Sales Order Item" : "Purchase Order Item";
        let update_method = voucher_type === "Sales Order"
            ? "demo.demo.report.voucher_action_report.voucher_action_report.update_sales_purchase_order_items_custom"
            : "demo.demo.report.voucher_action_report.voucher_action_report.update_sales_purchase_order_items_custom";

        $.when(
            frappe.call({
                method: "frappe.client.get",
                args: { doctype: voucher_type, name: voucher_no }
            }),
            frappe.db.get_doc("DocType", child_doctype)
        ).then(function(voucher_res, child_doc) {
            let voucher = voucher_res[0].message;
            let fields = [];

            child_doc.fields.forEach(function(df) {
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

            let items_data = voucher.items.map(function(item) {
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
                        method: update_method,
                        args: {
                            parent_doctype: voucher_type,
                            trans_items: JSON.stringify(values.items),
                            parent_doctype_name: voucher_no
                        },
                        callback: function(resp) {
                            if (!resp.exc) {
                                frappe.msgprint(__(voucher_type + " items updated."));
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
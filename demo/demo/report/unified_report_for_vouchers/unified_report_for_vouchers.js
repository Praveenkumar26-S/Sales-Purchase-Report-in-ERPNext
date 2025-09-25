// Copyright (c) 2025, PK and contributors
// For license information, please see license.txt

frappe.query_reports["Unified Report For Vouchers"] = {
    filters: [
        { fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
        { fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
        {
            fieldname: "voucher_type",
            label: __("Voucher Type"),
            fieldtype: "Select",
            options: [
                "",
                "Sales Order",
                "Purchase Order",
                "Sales Invoice",
                "Purchase Invoice",
                "Delivery Note",
                "Purchase Receipt"
            ]
        },
        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "Select",
            options: [
                "",
                "Draft",
                "To Deliver and Bill",
                "To Bill",
                "To Deliver",
                "Completed",
                "Cancelled",
                "Overdue"
            ]
        },
        {
            fieldname: "customer",
            label: __("Customer"),
            fieldtype: "Link",
            options: "Customer",
            depends_on: "eval:in_list(['Sales Order','Sales Invoice','Delivery Note'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            fieldname: "customer_group",
            label: __("Customer Group"),
            fieldtype: "Link",
            options: "Customer Group",
            depends_on: "eval:in_list(['Sales Order','Sales Invoice','Delivery Note'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            fieldname: "supplier",
            label: __("Supplier"),
            fieldtype: "Link",
            options: "Supplier",
            depends_on: "eval:in_list(['Purchase Order','Purchase Invoice','Purchase Receipt'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            fieldname: "supplier_group",
            label: __("Supplier Group"),
            fieldtype: "Link",
            options: "Supplier Group",
            depends_on: "eval:in_list(['Purchase Order','Purchase Invoice','Purchase Receipt'], frappe.query_report.get_filter_value('voucher_type'))"
        }
    ],

    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "actions" && data) {
            value = `
                <button class="btn btn-xs btn-primary"
                    onclick="updateEntry('${data.voucher_no}', '${data.voucher_type}')">
                    Update
                </button>
                <button class="btn btn-xs btn-success"
                    onclick="openCreateChooser('${data.voucher_no}', '${data.voucher_type}')">
                    Create
                </button>`;
        }

        if (column.fieldname === "view_items" && data) {
            value = `
                <button class="btn btn-xs btn-info"
                    onclick="viewItems('${data.voucher_no}', '${data.voucher_type}')">
                    View
                </button>`;
        }

        return value;
    }
};

     
function openCreateChooser(voucher_no, voucher_type) {
    let options = [];

    if (voucher_type === "Sales Order") {
        options = ["Sales Invoice", "Delivery Note"];
    } else if (voucher_type === "Purchase Order") {
        options = ["Purchase Invoice", "Purchase Receipt"];
    } else if (voucher_type === "Sales Invoice") {
        options = ["Delivery Note"];
    } else if (voucher_type === "Purchase Invoice") {
        options = ["Purchase Receipt"];
    }

    if (!options.length) {
        frappe.msgprint(__("No create actions available for {0}", [voucher_type]));
        return;
    }

    let dialog = new frappe.ui.Dialog({
        title: __("Create from {0}", [voucher_no]),
        fields: [
            {
                fieldname: "options_area",
                fieldtype: "HTML"
            }
        ]
    });

    let html = "<div style='margin-top:10px;'>";
    options.forEach(opt => {
        html += `<button class="btn btn-sm btn-default" 
                    style="margin:5px;"
                    onclick="createEntry('${voucher_no}', '${voucher_type}', '${opt}'); 
                             cur_dialog.hide();">
                    ${opt}
                 </button>`;
    });
    html += "</div>";

    dialog.fields_dict.options_area.$wrapper.html(html);
    dialog.show();
}

function createEntry(voucher_no, voucher_type, target=null) {
    frappe.call({
        method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.create_entry",
        args: { voucher_no: voucher_no, voucher_type: voucher_type, target: target },
        callback: function(r){
            if (r.message) {
                frappe.msgprint(r.message);
            }
        }
    });
}

function viewItems(voucher_no, voucher_type) {
    frappe.call({
        method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.view_items",
        args: { voucher_no: voucher_no, voucher_type: voucher_type },
        callback: function(r){
            if(r.message){
                frappe.msgprint({
                    title: "Items for " + voucher_no,
                    message: r.message,
                    indicator: "blue"
                });
            }
        }
    });
}

function updateEntry(voucher_no, voucher_type) {
    frappe.call({
        method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.get_voucher_items",
        args: { voucher_type: voucher_type, voucher_no: voucher_no},
        callback: function(r) {
            if (!r.message) {
                frappe.msgprint("No items found.");
                return;
            }

            let items = r.message.items || [];

            let dialog = new frappe.ui.Dialog({
                title: __("Update Items for " + voucher_no),
                fields: [
                    {
                        fieldname: "items",
                        fieldtype: "Table",
                        label: "Items",
                        in_place_edit: true,
                        fields: [
                            { fieldtype: "Data", fieldname: "item_code", label: "Item Code", in_list_view: true, reqd: 1 },
                            { fieldtype: "Data", fieldname: "item_name", label: "Item Name", in_list_view: true, reqd: 1},
                            { fieldtype: "Data", fieldname: "description", label: "Description", in_list_view: true },
                            { fieldtype: "Float", fieldname: "qty", label: "Qty", in_list_view: true, reqd: 1 },
                            { fieldtype: "Data", fieldname: "uom", label: "UOM", in_list_view: true, reqd: 1 },
                            { fieldtype: "Float", fieldname: "conversion_factor", label: "Conversion Factor", in_list_view: true, reqd: 1 },
                            { fieldtype: "Currency", fieldname: "rate", label: "Rate", in_list_view: true },
                            { fieldtype: "Currency", fieldname: "amount", label: "Amount", in_list_view: true }
                        ],
                        data: items
                    }
                ],
                primary_action_label: __("Update"),
                primary_action(values) {
                    frappe.call({
                        method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.update_voucher_items",
                        args: {voucher_type: voucher_type, voucher_no: voucher_no, items: JSON.stringify(values.items)},
                        callback: function(res) {
                            frappe.msgprint(res.message.message);
                            dialog.hide();
                        }
                    });
                }
            });
            dialog.show();
        }
    });
}




// function updateEntry(voucher_no, voucher_type) {
//     frappe.call({
//         method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.update_items_dialog",
//         args: { sales_order: voucher_no },  // pass voucher_no as sales_order
//         callback: function(r) {
//             if (!r.message || !r.message.length) {
//                 frappe.msgprint("No items found.");
//                 return;
//             }

//             let items = r.message.map(i => ({
//                 item_code: i.item_code,
//                 item_name: i.item_name,
//                 description: i.description,
//                 qty: i.qty,
//                 uom: i.uom,
//                 conversion_factor: 1.0,  // default if not present
//                 rate: 0.0,               // default if not present
//                 amount: 0.0              // default if not present
//             }));

//             let dialog = new frappe.ui.Dialog({
//                 title: __("Update Items for " + voucher_no),
//                 fields: [
//                     {
//                         fieldname: "items",
//                         fieldtype: "Table",
//                         label: "Items",
//                         in_place_edit: true,
//                         fields: [
//                             { fieldtype: "Data", fieldname: "item_code", label: "Item Code", in_list_view: true, reqd: 1 },
//                             { fieldtype: "Data", fieldname: "item_name", label: "Item Name", in_list_view: true, reqd: 1 },
//                             { fieldtype: "Data", fieldname: "description", label: "Description", in_list_view: true },
//                             { fieldtype: "Float", fieldname: "qty", label: "Qty", in_list_view: true, reqd: 1 },
//                             { fieldtype: "Data", fieldname: "uom", label: "UOM", in_list_view: true, reqd: 1 },
//                             { fieldtype: "Float", fieldname: "conversion_factor", label: "Conversion Factor", in_list_view: true, reqd: 1 },
//                             { fieldtype: "Currency", fieldname: "rate", label: "Rate", in_list_view: true },
//                             { fieldtype: "Currency", fieldname: "amount", label: "Amount", in_list_view: true }
//                         ],
//                         data: items
//                     }
//                 ],
//                 primary_action_label: __("Update"),
//                 primary_action(values) {
//                     frappe.call({
//                         method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.update_voucher_items",
//                         args: {
//                             voucher_type: voucher_type,
//                             voucher_no: voucher_no,
//                             items: JSON.stringify(values.items)
//                         },
//                         callback: function(res) {
//                             frappe.msgprint(res.message.message);
//                             dialog.hide();
//                         }
//                     });
//                 }
//             });

//             dialog.show();
//         }
//     });
// }

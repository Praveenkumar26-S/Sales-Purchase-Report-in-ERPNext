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



function updateEntry(voucher_no, voucher_type) {
    frappe.call({
        method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.update_entry",
        args: { voucher_no, voucher_type },
        callback: function(r) { frappe.msgprint(r.message); }
    });
}

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

    let d = new frappe.ui.Dialog({
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

    d.fields_dict.options_area.$wrapper.html(html);
    d.show();
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
        method: "demo.demo.report.unified_report_for_vouchers.unified_report_for_vouchers.get_items",
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
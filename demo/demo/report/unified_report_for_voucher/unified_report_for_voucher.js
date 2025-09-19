// Copyright (c) 2025, PK and contributors
// For license information, please see license.txt

frappe.query_reports["Unified Report for Voucher"] = {
   filters: [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
			reqd: 1,
		},
	]
};

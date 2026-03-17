import frappe

@frappe.whitelist()
def get_timeline(customer):
	events = []
	
	# 1. Communications (Emails & Calls)
	comms = frappe.db.get_all("Communication", 
		filters={"reference_doctype": "Customer", "reference_name": customer},
		fields=["name", "communication_type", "communication_medium", "subject", "content", "creation", "sender", "recipients"]
	)
	for c in comms:
		category = "emails"
		title = f"Email: {c.subject or 'No Subject'}"
		if c.communication_medium in ["Phone", "Call"]:
			category = "calls"
			title = f"Call: {c.subject or 'Log'}"
		elif c.communication_type == "Comment":
			continue # Handled below
			
		events.append({
			"category": category,
			"date": c.creation,
			"title": title,
			"content": str(c.content or '')[:200] + "..." if c.content and len(c.content) > 200 else c.content,
			"footer": f"From: {c.sender} | To: {c.recipients}",
			"doc": c.name
		})

	# 2. Financials (Sales Orders)
	orders = frappe.db.get_all("Sales Order",
		filters={"customer": customer},
		fields=["name", "status", "base_grand_total", "creation"]
	)
	for o in orders:
		events.append({
			"category": "financial",
			"date": o.creation,
			"title": f"Order {o.name} created",
			"content": f"Status: {o.status} | Amount: {frappe.utils.fmt_money(o.base_grand_total)}",
			"doc": o.name
		})

	# 3. Financials (Sales Invoice)
	invoices = frappe.db.get_all("Sales Invoice",
		filters={"customer": customer},
		fields=["name", "status", "base_grand_total", "creation"]
	)
	for i in invoices:
		events.append({
			"category": "financial",
			"date": i.creation,
			"title": f"Invoice {i.name} created",
			"content": f"Status: {i.status} | Amount: {frappe.utils.fmt_money(i.base_grand_total)}",
			"doc": i.name
		})

	# 4. Comments
	comments = frappe.db.get_all("Comment",
		filters={"reference_doctype": "Customer", "reference_name": customer},
		fields=["name", "content", "creation", "comment_by"]
	)
	for cm in comments:
		events.append({
			"category": "comments",
			"date": cm.creation,
			"title": f"Comment by {cm.comment_by}",
			"content": cm.content,
			"doc": cm.name
		})

	# 5. Payment Entries
	payments = frappe.db.get_all("Payment Entry",
		filters={"party_type": "Customer", "party": customer, "docstatus": ["<", 2]},
		fields=["name", "payment_type", "base_paid_amount", "creation"]
	)
	for p in payments:
		events.append({
			"category": "financial",
			"date": p.creation,
			"title": f"Payment {p.name} ({p.payment_type})",
			"content": f"Amount: {frappe.utils.fmt_money(p.base_paid_amount)}",
			"doc": p.name
		})

	# 6. Activity / Versions (Field Updates)
	versions = frappe.db.get_all("Version",
		filters={"ref_doctype": "Customer", "docname": customer},
		fields=["name", "creation", "data", "owner"],
		limit=50
	)
	import json
	for v in versions:
		try:
			data = json.loads(v.data)
			changed = data.get("changed", [])
			if changed:
				changes_str = "<br>".join([f"<b>{c[0]}</b> changed from '{c[1]}' to '{c[2]}'" for c in changed])
				events.append({
					"category": "system",
					"date": v.creation,
					"title": f"Customer updated by {v.owner}",
					"content": changes_str,
					"doc": v.name
				})
		except Exception:
			pass

	# (You can add Call Logs, Tasks, and custom Visit Logs here using the same structure)
	
	# Sort events descending by date
	events = sorted(events, key=lambda x: str(x.get('date', '')), reverse=True)
	
	return {"events": events}

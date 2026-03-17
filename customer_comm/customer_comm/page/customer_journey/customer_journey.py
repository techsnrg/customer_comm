import frappe

@frappe.whitelist()
def get_timeline(customer):
	events = []
	
	# 1. Communications (Emails)
	comms = frappe.db.get_all("Communication", 
		filters={"reference_doctype": "Customer", "reference_name": customer},
		fields=["name", "communication_type", "communication_medium", "subject", "content", "creation", "sender", "recipients"]
	)
	for c in comms:
		events.append({
			"category": "emails",
			"date": c.creation,
			"title": f"Email: {c.subject or 'No Subject'}",
			"content": c.content[:200] + "..." if c.content and len(c.content) > 200 else c.content,
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

	# (You can add Call Logs, Tasks, and custom Visit Logs here using the same structure)
	
	# Sort events descending by date
	events = sorted(events, key=lambda x: str(x.get('date', '')), reverse=True)
	
	return {"events": events}

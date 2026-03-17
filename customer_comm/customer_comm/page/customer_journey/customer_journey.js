frappe.pages['customer-journey'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Customer Journey',
		single_column: true
	});

	// Load HTML wrapper
	const html_template = `
		<style>
		.customer-journey-container { padding: 15px; background: #f8f9fa; min-height: calc(100vh - 120px); font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; }
		.cj-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; }
		.cj-customer-info h2 { margin: 0; font-size: 22px; font-weight: 600; color: #1f2937; }
		.cj-search-box { min-width: 300px; }
		.cj-tabs { display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
		.cj-tab { padding: 8px 16px; font-size: 14px; color: #4b5563; cursor: pointer; border-radius: 20px; transition: all 0.2s; }
		.cj-tab:hover { background: #f3f4f6; }
		.cj-tab.active { background: #1f2937; color: #fff; font-weight: 500; }
		.cj-timeline { position: relative; padding-left: 20px; }
		.cj-timeline::before { content: ''; position: absolute; top: 0; bottom: 0; left: 31px; width: 2px; background: #e5e7eb; }
		.cj-event { position: relative; margin-bottom: 20px; padding-left: 45px; }
		.cj-event-icon { position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 12px; z-index: 1; }
		.cj-event-content { background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #f3f4f6; }
		.cj-event-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
		.cj-event-title { font-weight: 600; color: #374151; font-size: 14px; }
		.cj-event-time { color: #9ca3af; font-size: 12px; }
		.cj-event-body { color: #4b5563; font-size: 13px; line-height: 1.5; }
		.cj-event-footer { margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px; font-size: 12px; color: #6b7280; }
		.cj-empty-state { text-align: center; padding: 40px; color: #6b7280; background: #fff; border-radius: 8px; border: 1px dashed #d1d5db; }
		.cj-event.type-email .cj-event-icon { border-color: #3b82f6; color: #3b82f6; }
		.cj-event.type-call .cj-event-icon { border-color: #10b981; color: #10b981; }
		.cj-event.type-visit .cj-event-icon { border-color: #8b5cf6; color: #8b5cf6; }
		.cj-event.type-financial .cj-event-icon { border-color: #f59e0b; color: #f59e0b; }
		.cj-event.type-comments .cj-event-icon { border-color: #6366f1; color: #6366f1; }
		</style>
		<div class="customer-journey-container">
			<div class="cj-header">
				<div class="cj-customer-info">
					<h2>Select a Customer</h2>
					<p class="text-muted" style="margin: 0; font-size: 13px;" id="cj-summary-text">Search for a customer to view their timeline</p>
				</div>
				<div class="cj-search-box" id="cj-customer-search"></div>
			</div>
			<div class="cj-body" style="display: none;" id="cj-main-body">
				<div class="cj-tabs" id="cj-tabs-container">
					<div class="cj-tab active" data-tab="all">All Activity</div>
					<div class="cj-tab" data-tab="emails">Emails</div>
					<div class="cj-tab" data-tab="calls">Calls</div>
					<div class="cj-tab" data-tab="visits">Visits</div>
					<div class="cj-tab" data-tab="financial">Financial</div>
					<div class="cj-tab" data-tab="comments">Comments</div>
				</div>
				<div class="cj-timeline" id="cj-timeline-container"></div>
			</div>
		</div>
	`;
	$(wrapper).find('.layout-main-section').html(html_template);

	// Store reference
	wrapper.cj = new CustomerJourney(wrapper);
}

class CustomerJourney {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.customer = null;
		this.current_tab = 'all';
		this.events = [];
		this.setup_ui();
	}

	setup_ui() {
		this.setup_customer_field();
		this.setup_tabs();
	}

	setup_customer_field() {
		let me = this;
		this.customer_field = frappe.ui.form.make_control({
			parent: this.wrapper.find('#cj-customer-search'),
			df: {
				fieldtype: 'Link',
				options: 'Customer',
				placeholder: 'Search Customer...',
				onchange: function() {
					let val = this.get_value();
					if(val) {
						me.customer = val;
						me.load_customer_data();
					} else {
						me.customer = null;
						me.wrapper.find('#cj-main-body').hide();
					}
				}
			},
			render_input: true
		});
		// Make the input look nicer
		this.customer_field.$input.css({'border-radius': '6px', 'padding': '8px 12px'});
	}

	setup_tabs() {
		let me = this;
		this.wrapper.find('.cj-tab').on('click', function() {
			me.wrapper.find('.cj-tab').removeClass('active');
			$(this).addClass('active');
			me.current_tab = $(this).data('tab');
			me.render_timeline();
		});
	}

	load_customer_data() {
		let me = this;
		this.wrapper.find('#cj-summary-text').text("Loading timeline...");
		
		frappe.call({
			method: "customer_comm.customer_comm.page.customer_journey.customer_journey.get_timeline",
			args: { customer: this.customer },
			callback: function(r) {
				if(r.message) {
					me.events = r.message.events || [];
					me.wrapper.find('#cj-summary-text').text(`${me.customer} • ${me.events.length} activities found`);
					me.wrapper.find('#cj-main-body').show();
					me.render_timeline();
				}
			}
		});
	}

	render_timeline() {
		let container = this.wrapper.find('#cj-timeline-container');
		container.empty();

		let filtered = this.events;
		if(this.current_tab !== 'all') {
			filtered = this.events.filter(e => e.category === this.current_tab);
		}

		if(filtered.length === 0) {
			container.html(`<div class="cj-empty-state">No activities found for this filter.</div>`);
			return;
		}

		filtered.forEach(ev => {
			let icon = this.get_icon(ev.category);
			let html = `
				<div class="cj-event type-${ev.category}">
					<div class="cj-event-icon">${icon}</div>
					<div class="cj-event-content">
						<div class="cj-event-header">
							<div class="cj-event-title">${ev.title}</div>
							<div class="cj-event-time">${frappe.datetime.global_date_format(ev.date)} ${frappe.datetime.get_time(ev.date)}</div>
						</div>
						<div class="cj-event-body">${ev.content || ''}</div>
						${ev.footer ? `<div class="cj-event-footer">${ev.footer}</div>` : ''}
					</div>
				</div>
			`;
			container.append(html);
		});
	}

	get_icon(category) {
		const icons = {
			'emails': '📧',
			'calls': '📞',
			'visits': '🚗',
			'financial': '💵',
			'comments': '💬',
			'system': '⚙️',
			'tasks': '📋'
		};
		return icons[category] || '📌';
	}
}

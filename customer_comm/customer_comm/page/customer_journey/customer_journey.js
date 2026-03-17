frappe.pages['customer-journey'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Customer Journey',
		single_column: true
	});

	// Load HTML wrapper
	$(wrapper).find('.layout-main-section').html(frappe.render_template("customer_journey"));

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

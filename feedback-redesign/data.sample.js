/* data.sample.js — realistic sample payload that MIRRORS the exact shape the
   manager-page Edge Function returns (data.customer_feedback, data.tasks, etc.).
   The 5 aesthetic mockups all render from this. To go to production, delete this
   file and replace `window.MP_DATA = SAMPLE` with a fetch() of the function —
   app.js reads the same fields either way. Data-through dates are baked in so the
   mockups always show "data through" lines (per the platform's hard rule). */
window.MP_DATA = {
  manager: { first_name: "Eddie", last_name: "Schmitt", role: "Owner" },
  scope_all: true,
  generated_through: "2026-06-03",

  customer_feedback: {
    data_through: "2026-06-03T11:51:18Z",
    summary: {
      needs_response: 59, last30_total: 492, last30_negative: 59, avg_rating_30: 4.49,
      by_source: [
        { source: "complaint", count: 23, negative: 23 },
        { source: "smg", count: 469, negative: 36 },
        { source: "google", count: 0, negative: 0 },
      ],
    },
    items: [
      { source: "complaint", store_name: "North Naperville", occurred_at: "2026-06-03T11:51:00Z", rating: null, sentiment: "negative", topic: "Food quality", needs_response: true, status: "open", ref: "1-8042217755", body_text: "Ordered the McDouble meal but received a plain McChicken. Drive-thru, no receipt offered. Wants a refund." },
      { source: "complaint", store_name: "Farnsworth", occurred_at: "2026-06-03T09:14:00Z", rating: null, sentiment: "negative", topic: "Missing item", needs_response: true, status: "open", ref: "1-8042210031", body_text: "Missing 1 of the hashbrowns I ordered, received the wrong size drink as well." },
      { source: "complaint", store_name: "Boulder Hill", occurred_at: "2026-06-02T19:40:00Z", rating: null, sentiment: "negative", topic: "Order accuracy", needs_response: true, status: "open", ref: "1-8041998820", body_text: "Received wrong item and would like a refund please. Ordered a 10pc, got a 4pc." },
      { source: "smg", store_name: "Lake St", occurred_at: "2026-06-02T15:30:00Z", rating: 1, sentiment: "negative", topic: "Speed of service", needs_response: true, status: "na", ref: null, body_text: "Waited 14 minutes in the drive thru at lunch. Two cars ahead of me. Unacceptable." },
      { source: "smg", store_name: "Oswego", occurred_at: "2026-06-02T13:05:00Z", rating: 2, sentiment: "negative", topic: "Cleanliness", needs_response: true, status: "na", ref: null, body_text: "Dining room tables were dirty, soda machine area sticky, trash overflowing." },
      { source: "smg", store_name: "Montgomery", occurred_at: "2026-06-01T18:22:00Z", rating: 2, sentiment: "negative", topic: "Friendliness", needs_response: true, status: "na", ref: null, body_text: "The person at the window seemed annoyed and didn't say thank you." },
      { source: "complaint", store_name: "Sandwich", occurred_at: "2026-06-01T12:00:00Z", rating: null, sentiment: "negative", topic: "Food quality", needs_response: true, status: "open", ref: "1-8041770042", body_text: "Fries were cold and old-tasting. Whole order felt like it had been sitting." },
      { source: "smg", store_name: "Yorkville", occurred_at: "2026-05-31T20:15:00Z", rating: 1, sentiment: "negative", topic: "Accuracy", needs_response: true, status: "na", ref: null, body_text: "Completely wrong order, had to come back. No apology." },
      { source: "smg", store_name: "Lake St", occurred_at: "2026-05-31T08:40:00Z", rating: 2, sentiment: "negative", topic: "Speed of service", needs_response: true, status: "na", ref: null, body_text: "Mobile order wasn't ready 10 minutes after I arrived." },
      { source: "smg", store_name: "Plano", occurred_at: "2026-05-30T17:00:00Z", rating: 2, sentiment: "negative", topic: "Cleanliness", needs_response: true, status: "na", ref: null, body_text: "Bathroom was out of order and the one that worked was not clean." },
    ],
  },

  tasks: [
    { id: 4412, title: "Replace drive-thru headset (Lane 2)", priority: "high", status: "in_progress", due_at: "2026-06-03", store_name: "Lake St", category: "maintenance", cohorts: "Maintenance Vendor" },
    { id: 4419, title: "Follow up with crew member re: scheduling", priority: "normal", status: "new", due_at: "2026-06-03", store_name: "Oswego", category: "store", cohorts: null },
    { id: 4401, title: "EcoSure corrective actions — walk-in temp log", priority: "urgent", status: "assigned", due_at: "2026-06-04", store_name: "Farnsworth", category: "store", cohorts: "Store Manager" },
    { id: 4423, title: "Submit Q2 local marketing co-op form", priority: "normal", status: "new", due_at: "2026-06-09", store_name: null, category: "office", cohorts: null },
    { id: 4388, title: "Repair shake machine — recurring fault", priority: "high", status: "waiting", due_at: "2026-06-10", store_name: "Montgomery", category: "maintenance", cohorts: "Maintenance Vendor" },
    { id: 4430, title: "Onboard 3 new crew — Boulder Hill", priority: "normal", status: "new", due_at: "2026-06-12", store_name: "Boulder Hill", category: "store", cohorts: null },
    { id: 4377, title: "Review June price round changes", priority: "normal", status: "new", due_at: "2026-06-14", store_name: null, category: "office", cohorts: null },
  ],

  complaints: [
    { id: 51, case_number: "1-8042217755", store_name: "North Naperville", issue_category: "Food quality", due_at: "2026-06-06", task_status: "assigned", recovery_needed: true, comment: "Ordered the McDouble meal but received a plain McChicken." },
    { id: 50, case_number: "1-8042210031", store_name: "Farnsworth", issue_category: "Missing item", due_at: "2026-06-06", task_status: "new", recovery_needed: false, comment: "Missing 1 of the hashbrowns I ordered." },
    { id: 49, case_number: "1-8041998820", store_name: "Boulder Hill", issue_category: "Order accuracy", due_at: "2026-06-05", task_status: "in_progress", recovery_needed: true, comment: "Received wrong item and would like a refund." },
    { id: 47, case_number: "1-8041770042", store_name: "Sandwich", issue_category: "Food quality", due_at: "2026-06-04", task_status: "new", recovery_needed: false, comment: "Fries were cold and old-tasting." },
  ],

  performance: {
    data_through: "2026-05-31",
    voice: [
      { store_name: "Combined", osat: 78.4, accuracy: 88.1, cleanliness: 81.0, n: 1240 },
      { store_name: "Lake St", osat: 74.2, accuracy: 85.0, cleanliness: 77.5, n: 142 },
      { store_name: "Oswego", osat: 81.0, accuracy: 90.2, cleanliness: 84.1, n: 138 },
      { store_name: "Farnsworth", osat: 72.8, accuracy: 83.4, cleanliness: 75.0, n: 121 },
      { store_name: "Montgomery", osat: 79.5, accuracy: 89.0, cleanliness: 82.3, n: 130 },
    ],
    sales: [
      { store_name: "Combined", mtd_product_sales: 526104, mtd_yoy_pct: 3.2, mtd_avg_check: 9.84 },
      { store_name: "Lake St", mtd_product_sales: 61240, mtd_yoy_pct: -1.4, mtd_avg_check: 9.51 },
      { store_name: "Oswego", mtd_product_sales: 58900, mtd_yoy_pct: 5.1, mtd_avg_check: 10.12 },
      { store_name: "Farnsworth", mtd_product_sales: 54310, mtd_yoy_pct: 2.0, mtd_avg_check: 9.40 },
    ],
  },

  calendar: [
    { event_date: "2026-06-03", title: "Free Fries Friday (app deal)", kind: "promo", store_name: null },
    { event_date: "2026-06-05", title: "EcoSure visit window opens — Farnsworth", kind: "deadline", store_name: "Farnsworth" },
    { event_date: "2026-06-09", title: "Q2 co-op marketing form due", kind: "deadline", store_name: null },
    { event_date: "2026-06-12", title: "Hazel Kraft site visit", kind: "event", store_name: null },
    { event_date: "2026-06-15", title: "Summer Drinks promo starts", kind: "promo", store_name: null },
  ],
};

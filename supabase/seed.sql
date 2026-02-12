-- CallScore Seed Data: Eval Templates
-- 3 industry-specific templates with JSONB criteria arrays

INSERT INTO eval_templates (name, description, industry, criteria, is_default) VALUES
(
  'Standard Sales Call Checklist',
  'General-purpose evaluation criteria for field service sales and service calls. Works across all trades.',
  'general',
  '[
    {"name": "Proper Introduction", "description": "Did the technician introduce themselves by name and company within the first 30 seconds of the call?", "category": "greeting"},
    {"name": "Needs Assessment", "description": "Did the technician ask questions to understand the customer''s problem, needs, and expectations before proposing a solution?", "category": "diagnosis"},
    {"name": "Service Explanation", "description": "Did the technician clearly explain what service or repair is needed, using language the customer can understand?", "category": "diagnosis"},
    {"name": "Pricing Presentation", "description": "Did the technician present pricing clearly, including any options or tiers, before beginning work?", "category": "sales_technique"},
    {"name": "Trial Close", "description": "Did the technician attempt a trial close or ask for commitment at an appropriate point in the conversation?", "category": "sales_technique"},
    {"name": "Objection Handling", "description": "When the customer raised concerns or objections, did the technician address them professionally and provide reassurance?", "category": "sales_technique"},
    {"name": "Next Steps & Scheduling", "description": "Did the technician clearly outline next steps, schedule follow-up, or confirm the appointment before ending the call?", "category": "closing"}
  ]',
  TRUE
),
(
  'Quick Service Visit',
  'Streamlined checklist for shorter service visits and follow-up calls.',
  'general',
  '[
    {"name": "Greeting & Identification", "description": "Did the technician greet the customer warmly and identify themselves and their company?", "category": "greeting"},
    {"name": "Problem Diagnosis Explanation", "description": "Did the technician explain what they found during diagnosis in clear, customer-friendly terms?", "category": "diagnosis"},
    {"name": "Upsell Attempt", "description": "Did the technician mention additional services, maintenance plans, or upgrades that could benefit the customer?", "category": "sales_technique"},
    {"name": "Payment Collection", "description": "Did the technician clearly communicate the total cost and collect payment or confirm billing arrangements?", "category": "closing"},
    {"name": "Follow-Up Scheduling", "description": "Did the technician schedule or suggest a follow-up visit, maintenance appointment, or check-in?", "category": "closing"}
  ]',
  FALSE
),
(
  'HVAC Sales & Service',
  'Comprehensive evaluation criteria specific to HVAC sales calls, including equipment and efficiency discussions.',
  'hvac',
  '[
    {"name": "Proper Introduction", "description": "Did the technician introduce themselves by name and company within the first 30 seconds?", "category": "greeting"},
    {"name": "Needs Assessment", "description": "Did the technician ask about the customer''s comfort issues, system age, and usage patterns?", "category": "diagnosis"},
    {"name": "Equipment Discussion", "description": "Did the technician discuss the specific equipment model, brand, and relevant specifications with the customer?", "category": "diagnosis"},
    {"name": "Efficiency Comparison", "description": "Did the technician compare energy efficiency ratings (SEER, AFUE, HSPF) between the current system and proposed options?", "category": "sales_technique"},
    {"name": "Pricing & Options", "description": "Did the technician present multiple pricing options (good/better/best) and explain the value differences?", "category": "sales_technique"},
    {"name": "Financing Options", "description": "Did the technician mention available financing plans, rebates, or payment options?", "category": "sales_technique"},
    {"name": "Objection Handling", "description": "When the customer raised concerns about cost or timing, did the technician address them with empathy and data?", "category": "sales_technique"},
    {"name": "Trial Close", "description": "Did the technician ask for a commitment or attempt to close the sale at an appropriate moment?", "category": "closing"},
    {"name": "Next Steps", "description": "Did the technician clearly confirm next steps including installation scheduling, permits, or follow-up?", "category": "closing"}
  ]',
  FALSE
);

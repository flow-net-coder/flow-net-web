const { pgTable, text } = require('drizzle-orm/pg-core');

const pipeline = pgTable('pipeline', {
  id: text('id').primaryKey(),
  stage: text('stage').notNull().default('demos_ideas'),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  project_idea: text('project_idea'),
  project_goal: text('project_goal'),
  timeline: text('timeline'),
  additional_details: text('additional_details'),
  source: text('source').default('website'),
  proposal_notes: text('proposal_notes'),
  demo_url: text('demo_url'),
  quote_amount: text('quote_amount'),
  scope_summary: text('scope_summary'),
  app_name: text('app_name'),
  live_url: text('live_url'),
  monthly_price: text('monthly_price'),
  status: text('status').default('new'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
});

const submissions = pgTable('submissions', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  project_idea: text('project_idea'),
  project_goal: text('project_goal'),
  timeline: text('timeline'),
  additional_details: text('additional_details'),
  timestamp: text('timestamp'),
});

module.exports = {
  pipeline,
  submissions,
};

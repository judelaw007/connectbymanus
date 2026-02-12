-- MojiTax Connect - Seed Data
-- Run this AFTER the initial schema migration
-- This creates default channels and sample data

-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- Note: Replace 'admin-open-id' with the actual openId from your OAuth provider

INSERT INTO users (open_id, name, email, role, login_method)
VALUES ('admin-mojitax', 'MojiTax Admin', 'admin@mojitax.co.uk', 'admin', 'oauth')
ON CONFLICT (open_id) DO UPDATE SET role = 'admin';

-- Get the admin user ID for use in channel creation
DO $$
DECLARE
    admin_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE open_id = 'admin-mojitax';

    -- ============================================
    -- CREATE DEFAULT CHANNELS
    -- ============================================

    -- General Channel (the only default channel — admins create topic channels as needed)
    INSERT INTO channels (name, description, type, is_private, created_by)
    VALUES (
        'General',
        'Welcome to MojiTax Connect! Introduce yourself and connect with fellow tax professionals.',
        'general',
        false,
        admin_id
    );

    -- Add admin as owner to all channels
    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT c.id, admin_id, 'owner'
    FROM channels c
    WHERE c.created_by = admin_id
    ON CONFLICT (channel_id, user_id) DO NOTHING;

END $$;

-- ============================================
-- SAMPLE KNOWLEDGE BASE ENTRIES
-- ============================================

INSERT INTO moji_knowledge_base (question, answer, category, tags, is_active)
VALUES
    -- Platform help
    (
        'How do I use @moji?',
        'Just mention @moji in any chat message and ask your question! I''ll search my knowledge base and use AI to help answer your tax questions. If I can''t help, I''ll connect you with Team MojiTax.',
        'Platform Help',
        'moji, chatbot, help, getting started',
        true
    ),
    (
        'How do I create a study group?',
        'Click the "Create Group" button in the sidebar. Enter a name and description for your group. You can make it private (invite-only) or public. Once created, share the invite code with your study partners!',
        'Platform Help',
        'study group, create, private, invite',
        true
    ),
    (
        'How do I contact support?',
        'Click "Chat with Team MojiTax" in the sidebar to start a support conversation. You can chat with @moji first, or request a human agent for complex questions.',
        'Platform Help',
        'support, help, contact, human',
        true
    ),

    -- ADIT Exam
    (
        'What is the ADIT qualification?',
        'The Advanced Diploma in International Taxation (ADIT) is a specialist qualification offered by the Chartered Institute of Taxation (CIOT). It covers principles of international taxation, transfer pricing, and allows specialization through optional modules.',
        'ADIT Exam',
        'ADIT, qualification, CIOT, diploma',
        true
    ),
    (
        'What are the ADIT exam papers?',
        'ADIT consists of: Paper 1 (Principles of International Taxation - compulsory), Paper 2 (Advanced International Taxation - choose one jurisdiction), and Paper 3 (Transfer Pricing OR Indirect Taxes OR Taxation of Corporate Finance).',
        'ADIT Exam',
        'ADIT, papers, modules, exam structure',
        true
    ),
    (
        'When are ADIT exams held?',
        'ADIT exams are typically held twice a year in June and December. Registration usually opens 3-4 months before the exam date. Check the CIOT website for exact dates and deadlines.',
        'ADIT Exam',
        'ADIT, exam dates, schedule, registration',
        true
    ),

    -- VAT
    (
        'What is the VAT registration threshold in the UK?',
        'As of 2024, the UK VAT registration threshold is £85,000. Businesses must register if their taxable turnover exceeds this amount in any 12-month period, or if they expect it to exceed the threshold in the next 30 days alone.',
        'VAT',
        'VAT, UK, registration, threshold',
        true
    ),
    (
        'What is reverse charge VAT?',
        'Reverse charge is a mechanism where the recipient of goods/services accounts for VAT instead of the supplier. It''s commonly used in B2B cross-border transactions within the EU and for certain domestic supplies like construction services in the UK.',
        'VAT',
        'VAT, reverse charge, B2B, cross-border',
        true
    ),

    -- Transfer Pricing
    (
        'What is the arm''s length principle?',
        'The arm''s length principle requires that transactions between related parties be priced as if they were between independent parties. This is the international standard for transfer pricing set by the OECD Guidelines.',
        'Transfer Pricing',
        'transfer pricing, arm''s length, OECD, related parties',
        true
    ),
    (
        'What are the five transfer pricing methods?',
        'The OECD recognizes five methods: 1) Comparable Uncontrolled Price (CUP), 2) Resale Price Method, 3) Cost Plus Method, 4) Transactional Net Margin Method (TNMM), and 5) Profit Split Method. The most appropriate method depends on the transaction type and data availability.',
        'Transfer Pricing',
        'transfer pricing, methods, OECD, CUP, TNMM',
        true
    ),

    -- General Tax
    (
        'What is BEPS?',
        'BEPS (Base Erosion and Profit Shifting) refers to tax planning strategies that exploit gaps between tax rules to artificially shift profits to low-tax locations. The OECD/G20 BEPS Project developed 15 Actions to address these issues.',
        'International Tax',
        'BEPS, OECD, profit shifting, tax avoidance',
        true
    ),
    (
        'What is a double tax treaty?',
        'A double tax treaty (or double taxation agreement/DTA) is a bilateral agreement between two countries that defines taxing rights to prevent the same income being taxed twice. They typically reduce withholding taxes and provide tie-breaker rules for residency.',
        'International Tax',
        'double tax, treaty, DTA, withholding',
        true
    );

-- ============================================
-- WELCOME MESSAGE IN GENERAL CHANNEL
-- ============================================

DO $$
DECLARE
    admin_id INTEGER;
    general_channel_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE open_id = 'admin-mojitax';
    SELECT id INTO general_channel_id FROM channels WHERE name = 'General' AND type = 'general';

    -- System welcome message
    INSERT INTO messages (channel_id, user_id, content, message_type)
    VALUES (
        general_channel_id,
        admin_id,
        E'Welcome to **MojiTax Connect**! 🎉\n\nThis is your community hub for international tax professionals. Here''s how to get started:\n\n• **Explore Topic Channels** - Join discussions on VAT, Transfer Pricing, ADIT, and more\n• **Create Study Groups** - Form private groups for exam prep or project collaboration\n• **Ask @moji** - Mention @moji in any message to get AI-powered tax assistance\n• **Get Support** - Click "Chat with Team MojiTax" for human support\n\nIntroduce yourself below and let us know what area of international tax you specialize in!',
        'system'
    );
END $$;

-- ============================================
-- VERIFY SEED DATA
-- ============================================

-- Show summary of seeded data
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Channels', COUNT(*) FROM channels
UNION ALL
SELECT 'Knowledge Base', COUNT(*) FROM moji_knowledge_base
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages;

-- ==============================================================================
-- PERSONAL TUITION MANAGEMENT SCHEMA MIGRATION
-- Atomic Unit: class_sessions
-- ==============================================================================

-- 1. Enum Types
CREATE TYPE class_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'MISSED');
CREATE TYPE payment_status AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'WAIVED', 'COVERED_BY_ADVANCE');
CREATE TYPE payment_policy_type AS ENUM ('PER_CLASS', 'AFTER_N_CLASSES', 'ADVANCE_CYCLE');
CREATE TYPE calendar_event_type AS ENUM ('EXAM', 'ASSIGNMENT_DUE', 'HOLIDAY', 'PARENT_MEETING', 'NOTE');

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS tuition_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    default_duration_min INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Teachers Table (with payment policy & deferral tracking)
CREATE TABLE IF NOT EXISTS tuition_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
    policy_type payment_policy_type DEFAULT 'AFTER_N_CLASSES',
    cycle_size INT DEFAULT 4,
    advance_balance NUMERIC(10, 2) DEFAULT 0.00,
    is_delayed BOOLEAN DEFAULT FALSE,
    delayed_until DATE,
    delay_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teacher-Subject Association
CREATE TABLE IF NOT EXISTS tuition_teacher_subjects (
    teacher_id UUID REFERENCES tuition_teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES tuition_subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- 5. Recurring Schedules (Defines weekly routine)
CREATE TABLE IF NOT EXISTS tuition_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES tuition_teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES tuition_subjects(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    duration_min INT NOT NULL DEFAULT 90,
    rate NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Class Sessions (The Core Model)
CREATE TABLE IF NOT EXISTS tuition_class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES tuition_schedules(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES tuition_teachers(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES tuition_subjects(id) ON DELETE RESTRICT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_min INT NOT NULL DEFAULT 90,
    fee NUMERIC(10, 2) NOT NULL,
    status class_status DEFAULT 'SCHEDULED',
    payment_status payment_status DEFAULT 'UNPAID',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tuition_sessions_scheduled_at ON tuition_class_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tuition_sessions_payment_status ON tuition_class_sessions(payment_status);
CREATE INDEX IF NOT EXISTS idx_tuition_sessions_teacher_id ON tuition_class_sessions(teacher_id);

-- 7. Payment Ledger & Settlements
CREATE TABLE IF NOT EXISTS tuition_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES tuition_teachers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL DEFAULT 'CYCLE_SETTLEMENT', -- 'PER_CLASS' | 'CYCLE_SETTLEMENT' | 'ADVANCE_DEPOSIT'
    method TEXT DEFAULT 'Bank Transfer',
    reference TEXT,
    note TEXT,
    session_ids TEXT[], -- Array of covered session IDs
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Session Notes & Homework
CREATE TABLE IF NOT EXISTS tuition_session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tuition_class_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_homework BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Standalone Academic Events
CREATE TABLE IF NOT EXISTS tuition_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    event_type calendar_event_type DEFAULT 'EXAM',
    subject_id UUID REFERENCES tuition_subjects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

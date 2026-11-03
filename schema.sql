-- QA Agent: skema database v2 (PostgreSQL)
-- Definisi test case dipisah dari hasil eksekusi, supaya satu test case bisa dijalankan berkali-kali.

create table users (
  id          bigint primary key,            -- Telegram user id
  username    text,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Kumpulan test case (hasil import Excel + judul)
create table test_case_sets (
  id          serial primary key,
  kind        text not null check (kind in ('software','hardware')),
  title       text not null,
  created_by  bigint references users(id),
  created_at  timestamptz not null default now()
);

-- ============ 1. TEST CASE SOFTWARE (definisi) ============
create table test_cases_software (
  id               serial primary key,
  set_id           int  not null references test_case_sets(id) on delete cascade,
  tc_id            text not null,                              -- TC ID
  module_menu      text,                                       -- Modul/Menu
  feature          text,                                       -- Fitur
  ref_requirement  text not null default '[isi ref]',          -- Ref Requirement
  scenario         text not null,                              -- Scenario
  tc_type          text not null check (tc_type in ('Positive','Negative')),   -- Tipe
  priority         text not null check (priority in ('Low','Medium','High')),
  precondition     text,
  test_data        text,
  test_steps       text not null,
  expected_result  text not null,
  notes            text,                                       -- catatan tentang test case-nya
  is_active        boolean not null default true,              -- nonaktifkan, jangan hapus
  position         int not null default 0,
  unique (set_id, tc_id)
);

-- ============ 2. TEST CASE HARDWARE (definisi) ============
create table test_cases_hardware (
  id                    serial primary key,
  set_id                int  not null references test_case_sets(id) on delete cascade,
  tc_id                 text not null,
  component_subsystem   text,                                  -- Komponen / Subsistem
  scenario              text not null,
  tc_type               text not null check (tc_type in ('Positive','Negative')),
  criticality           text not null check (criticality in ('Low','Medium','High','Critical')),
  precondition          text,                                  -- kondisi device
  test_steps            text not null,
  parameter             text,                                  -- Parameter Diukur
  unit                  text,                                  -- Satuan
  pass_limit            text,                                  -- Batas Lulus (Spec), tampilan teks mis. "3,3 V ± 5%"
  spec_min              numeric,                               -- opsional: batas bawah, untuk penilaian otomatis
  spec_max              numeric,                               -- opsional: batas atas
  spec_source           text,                                  -- Sumber Spec
  expected_result       text not null,
  notes                 text,
  is_active             boolean not null default true,
  position              int not null default 0,
  unique (set_id, tc_id)
);

-- ============ 3. TEST EXECUTION (header satu kali pengujian) ============
create table test_executions (
  id             serial primary key,
  code           text unique,                                  -- mis. EXE-2026-001
  title          text not null,
  kind           text not null check (kind in ('software','hardware')),
  build_version  text,                                         -- versi build / firmware yang diuji
  environment    text,                                         -- environment, device, atau serial number
  status         text not null default 'Draft' check (status in ('Draft','Running','Done')),
  planned_date   date,
  created_by     bigint references users(id),
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  completed_at   timestamptz,
  report_name    text,                                         -- report PDF
  report_path    text,
  report_size    int,
  notes          text
);

-- Kumpulan test case yang dipilih saat membuat execution (asal-usul execution)
create table test_execution_sets (
  execution_id  int not null references test_executions(id) on delete cascade,
  set_id        int not null references test_case_sets(id),
  primary key (execution_id, set_id)
);

-- ============ HASIL PER TEST CASE (diisi saat dijalankan) ============
create table execution_results_software (
  id              serial primary key,
  execution_id    int not null references test_executions(id) on delete cascade,
  test_case_id    int not null references test_cases_software(id),
  actual_result   text,
  status          text not null default 'Not Run' check (status in ('Not Run','Fail','Blocked','Pass')),
  evidence        text[] not null default '{}',                -- daftar link screenshot/video
  bug_id          text,
  tester_id       bigint references users(id),
  tested_at       timestamptz,
  notes           text,
  unique (execution_id, test_case_id),
  check (status = 'Not Run' or (tester_id is not null and tested_at is not null))
);

create table execution_results_hardware (
  id              serial primary key,
  execution_id    int not null references test_executions(id) on delete cascade,
  test_case_id    int not null references test_cases_hardware(id),
  measured_value  numeric,                                     -- Nilai Terukur
  actual_result   text,
  status          text not null default 'Not Run' check (status in ('Not Run','Fail','Blocked','Pass')),
  evidence        text[] not null default '{}',
  bug_id          text,
  tester_id       bigint references users(id),
  tested_at       timestamptz,
  notes           text,
  unique (execution_id, test_case_id),
  check (status = 'Not Run' or (tester_id is not null and tested_at is not null))
);

create index on test_cases_software (set_id, position);
create index on test_cases_hardware (set_id, position);
create index on execution_results_software (execution_id, status);
create index on execution_results_hardware (execution_id, status);

-- Progres per execution (untuk daftar Test Execution di Mini App)
create view v_execution_progress as
select e.id, e.code, e.title, e.kind, e.status as exec_status,
       count(r.status)                                   as total,
       count(*) filter (where r.status <> 'Not Run')     as executed,
       count(*) filter (where r.status = 'Pass')         as pass,
       count(*) filter (where r.status = 'Fail')         as fail,
       count(*) filter (where r.status = 'Blocked')      as blocked
from test_executions e
left join (
  select execution_id, status from execution_results_software
  union all
  select execution_id, status from execution_results_hardware
) r on r.execution_id = e.id
group by e.id;

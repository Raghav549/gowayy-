-- Additive tenant foundation. Back up first. No existing customer table alteration.
CREATE TABLE IF NOT EXISTS gw_organizations (
 id text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('shop','grocery','restaurant','hotel','cab','tour')),
 display_name text NOT NULL, description text NOT NULL DEFAULT '', contact_email text NOT NULL,
 contact_phone text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gw_organization_memberships (
 user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 organization_id text NOT NULL REFERENCES gw_organizations(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('owner','manager','staff','driver')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','invited')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,organization_id)
);
CREATE INDEX IF NOT EXISTS gw_org_member_lookup ON gw_organization_memberships(organization_id,role);
CREATE TABLE IF NOT EXISTS gw_partner_audit (
 id bigserial PRIMARY KEY, actor_id integer REFERENCES users(id), organization_id text REFERENCES gw_organizations(id),
 action text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

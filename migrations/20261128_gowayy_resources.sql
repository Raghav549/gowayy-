-- Map approved partner organizations to existing listings. This is a separate
-- ownership mapping: never infer access just from a company name or email.
CREATE TABLE IF NOT EXISTS gw_organization_resources (
  organization_id text NOT NULL REFERENCES gw_organizations(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('vendor','hotel','cab_type','package')),
  resource_id integer NOT NULL CHECK(resource_id > 0),
  PRIMARY KEY(organization_id,resource_type,resource_id)
);
CREATE INDEX IF NOT EXISTS gw_organization_resources_reverse
  ON gw_organization_resources(resource_type,resource_id);
-- Associations are created by platform administrators after verifying real ownership.

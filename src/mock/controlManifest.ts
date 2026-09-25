/**
 * Control-plane manifest for the mock console. NOT written by hand.
 *
 * Dumped from the backend own lib/api/{system,tenants}/routes.ts through the real loader and
 * the real manifest generator, so this demo renders what the framework emits: the operators as
 * a resource under a two-segment prefix (T-10.20), and the two tied calls of a container
 * destruction with the body the second one asks for (T-10.21). Regenerate it the same way when
 * those routes change, rather than editing it here. One field is set after the dump: `auth.mode`
 * is `bearer` whatever the dumped deployment ran, because the mock auth client holds its session
 * as a token.
 */
import type { Manifest } from "@/engine"

export const mockControlManifest: Manifest = {
  "version": 2,
  "generatedAt": "2026-09-25T12:16:43.497Z",
  "i18n": {
    "defaultLocale": "en",
    "locales": [
      "en"
    ]
  },
  "auth": {
    "mode": "bearer",
    "plane": "control",
    "endpoints": {
      "flowOptions": "/system/auth/flow/options",
      "flowStart": "/system/auth/flow/start",
      "flowStep": "/system/auth/flow/step",
      "flowChallenge": "/system/auth/flow/challenge",
      "flowCancel": "/system/auth/flow/cancel",
      "refresh": "/system/auth/refresh-token",
      "logout": "/system/auth/logout",
      "sessions": "/system/auth/sessions",
      "me": "/system/auth/me",
      "mfaSetup": "/system/auth/mfa/setup",
      "mfaEnable": "/system/auth/mfa/enable"
    }
  },
  "tenancy": {
    "mode": "multi",
    "switchable": false
  },
  "groups": [
    {
      "name": "system",
      "label": "group.system"
    }
  ],
  "enums": {},
  "resources": [
    {
      "name": "tenant",
      "path": "tenants",
      "label": {
        "singular": "res.tenant.singular",
        "plural": "res.tenant.plural"
      },
      "capabilities": [
        {
          "name": "list",
          "kind": "list",
          "method": "GET",
          "path": "/tenants",
          "roles": [
            "system:operator",
            "system:auditor",
            "system:admin"
          ]
        },
        {
          "name": "create",
          "kind": "create",
          "method": "POST",
          "path": "/tenants",
          "roles": [
            "system:operator",
            "system:admin"
          ]
        },
        {
          "name": "read",
          "kind": "read",
          "method": "GET",
          "path": "/tenants/:id",
          "roles": [
            "system:operator",
            "system:auditor",
            "system:admin"
          ]
        },
        {
          "name": "update",
          "kind": "update",
          "method": "PUT",
          "path": "/tenants/:id",
          "roles": [
            "system:operator",
            "system:admin"
          ]
        },
        {
          "name": "delete",
          "kind": "delete",
          "method": "DELETE",
          "path": "/tenants/:id",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "target": [
            "row"
          ]
        },
        {
          "name": "suspend",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/:id/suspend",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.suspend",
          "target": [
            "row"
          ],
          "input": {
            "fields": [
              {
                "name": "reason",
                "type": "string",
                "widget": "textarea"
              }
            ]
          }
        },
        {
          "name": "destruction-request",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/:id/destruction-request",
          "roles": [
            "system:admin"
          ],
          "label": "action.tenant.destruction-request",
          "target": [
            "row"
          ]
        },
        {
          "name": "data",
          "kind": "action",
          "method": "DELETE",
          "path": "/tenants/:id/data",
          "roles": [
            "system:admin"
          ],
          "label": "action.tenant.data",
          "target": [
            "row"
          ],
          "input": {
            "fields": [
              {
                "name": "token",
                "type": "string",
                "required": true
              },
              {
                "name": "slug",
                "type": "string",
                "required": true
              },
              {
                "name": "otp",
                "type": "string",
                "required": true
              }
            ]
          }
        },
        {
          "name": "export",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/:id/export",
          "roles": [
            "system:admin"
          ],
          "label": "action.tenant.export",
          "target": [
            "row"
          ]
        },
        {
          "name": "impersonate",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/:id/impersonate",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.impersonate",
          "target": [
            "row"
          ],
          "input": {
            "fields": [
              {
                "name": "userId",
                "type": "string",
                "required": true,
                "placeholder": "input.tenant.impersonate.userId"
              },
              {
                "name": "reason",
                "type": "string",
                "required": true,
                "widget": "textarea"
              }
            ]
          }
        },
        {
          "name": "end",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/impersonate/end",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.end",
          "target": [
            "collection"
          ]
        },
        {
          "name": "restore",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/:id/restore",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.restore",
          "target": [
            "row"
          ]
        },
        {
          "name": "identity-providers",
          "kind": "action",
          "method": "GET",
          "path": "/tenants/:id/identity-providers",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.identity-providers",
          "target": [
            "row"
          ]
        },
        {
          "name": "identity-providers_post",
          "kind": "action",
          "method": "POST",
          "path": "/tenants/:id/identity-providers",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.identity-providers_post",
          "target": [
            "row"
          ],
          "input": {
            "fields": [
              {
                "name": "key",
                "type": "string",
                "required": true
              },
              {
                "name": "type",
                "type": "enum",
                "required": true
              },
              {
                "name": "status",
                "type": "enum"
              },
              {
                "name": "config",
                "type": "json",
                "required": true
              },
              {
                "name": "clientSecret",
                "type": "string"
              }
            ]
          }
        },
        {
          "name": "identity-providers_get",
          "kind": "action",
          "method": "GET",
          "path": "/tenants/:id/identity-providers/:key",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.identity-providers_get",
          "target": [
            "row"
          ]
        },
        {
          "name": "identity-providers_put",
          "kind": "action",
          "method": "PUT",
          "path": "/tenants/:id/identity-providers/:key",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.identity-providers_put",
          "target": [
            "row"
          ],
          "input": {
            "fields": [
              {
                "name": "status",
                "type": "enum"
              },
              {
                "name": "config",
                "type": "json"
              },
              {
                "name": "clientSecret",
                "type": "string"
              }
            ]
          }
        },
        {
          "name": "identity-providers_delete",
          "kind": "action",
          "method": "DELETE",
          "path": "/tenants/:id/identity-providers/:key",
          "roles": [
            "system:operator",
            "system:admin"
          ],
          "label": "action.tenant.identity-providers_delete",
          "target": [
            "row"
          ]
        }
      ],
      "fields": [
        {
          "name": "id",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "name",
          "type": "string",
          "validation": {
            "minLength": 1,
            "maxLength": 255
          },
          "required": true
        },
        {
          "name": "slug",
          "type": "string",
          "validation": {
            "minLength": 1,
            "maxLength": 100,
            "pattern": "^[a-z0-9_-]+$"
          },
          "required": true
        },
        {
          "name": "strategy",
          "type": "enum",
          "enum": [
            {
              "value": "schema",
              "label": "enum.strategy.schema"
            },
            {
              "value": "container",
              "label": "enum.strategy.container"
            }
          ]
        },
        {
          "name": "engine",
          "type": "enum",
          "enum": [
            {
              "value": "postgres",
              "label": "enum.engine.postgres"
            },
            {
              "value": "sqlite",
              "label": "enum.engine.sqlite"
            },
            {
              "value": "libsql",
              "label": "enum.engine.libsql"
            }
          ]
        },
        {
          "name": "locator",
          "type": "string",
          "validation": {
            "minLength": 1,
            "maxLength": 63,
            "pattern": "^[a-zA-Z0-9_]+$"
          }
        },
        {
          "name": "schemaVersion",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "status",
          "type": "enum",
          "enum": [
            {
              "value": "active",
              "label": "enum.status.active"
            },
            {
              "value": "suspended",
              "label": "enum.status.suspended"
            },
            {
              "value": "archived",
              "label": "enum.status.archived"
            }
          ]
        },
        {
          "name": "config",
          "type": "json"
        },
        {
          "name": "createdAt",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "updatedAt",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "admin",
          "type": "json",
          "required": true,
          "writeOnly": true
        }
      ],
      "group": "system",
      "titleField": "name"
    },
    {
      "name": "systemAccessLog",
      "path": "system/access-log",
      "label": {
        "singular": "res.systemAccessLog.singular",
        "plural": "res.systemAccessLog.plural"
      },
      "capabilities": [
        {
          "name": "list",
          "kind": "list",
          "method": "GET",
          "path": "/system/access-log",
          "roles": [
            "system:auditor",
            "system:admin"
          ]
        }
      ],
      "fields": [
        {
          "name": "id",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "occurredAt",
          "type": "datetime",
          "readOnly": true
        },
        {
          "name": "scope",
          "type": "enum",
          "enum": [
            {
              "value": "tenant",
              "label": "enum.scope.tenant"
            },
            {
              "value": "control",
              "label": "enum.scope.control"
            }
          ],
          "readOnly": true
        },
        {
          "name": "event",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "outcome",
          "type": "enum",
          "enum": [
            {
              "value": "success",
              "label": "enum.outcome.success"
            },
            {
              "value": "failure",
              "label": "enum.outcome.failure"
            }
          ],
          "readOnly": true
        },
        {
          "name": "code",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "subjectId",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "methods",
          "type": "json",
          "readOnly": true
        },
        {
          "name": "provider",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "flowId",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "sid",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "ip",
          "type": "string",
          "readOnly": true
        }
      ],
      "group": "system",
      "titleField": "event",
      "subtitleField": "occurredAt"
    },
    {
      "name": "systemUser",
      "path": "system/users",
      "label": {
        "singular": "res.systemUser.singular",
        "plural": "res.systemUser.plural"
      },
      "capabilities": [
        {
          "name": "list",
          "kind": "list",
          "method": "GET",
          "path": "/system/users",
          "roles": [
            "system:admin"
          ]
        },
        {
          "name": "read",
          "kind": "read",
          "method": "GET",
          "path": "/system/users/:id",
          "roles": [
            "system:admin"
          ]
        },
        {
          "name": "create",
          "kind": "create",
          "method": "POST",
          "path": "/system/users",
          "roles": [
            "system:admin"
          ]
        },
        {
          "name": "update",
          "kind": "update",
          "method": "PUT",
          "path": "/system/users/:id",
          "roles": [
            "system:admin"
          ]
        },
        {
          "name": "delete",
          "kind": "delete",
          "method": "DELETE",
          "path": "/system/users/:id",
          "roles": [
            "system:admin"
          ],
          "target": [
            "row"
          ]
        },
        {
          "name": "block",
          "kind": "action",
          "method": "POST",
          "path": "/system/users/:id/block",
          "roles": [
            "system:admin"
          ],
          "label": "action.systemUser.block",
          "target": [
            "row"
          ],
          "input": {
            "fields": [
              {
                "name": "reason",
                "type": "string",
                "widget": "textarea"
              }
            ]
          }
        },
        {
          "name": "unblock",
          "kind": "action",
          "method": "POST",
          "path": "/system/users/:id/unblock",
          "roles": [
            "system:admin"
          ],
          "label": "action.systemUser.unblock",
          "target": [
            "row"
          ]
        },
        {
          "name": "reset",
          "kind": "action",
          "method": "POST",
          "path": "/system/users/:id/mfa/reset",
          "roles": [
            "system:admin"
          ],
          "label": "action.systemUser.reset",
          "target": [
            "row"
          ]
        }
      ],
      "fields": [
        {
          "name": "id",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "email",
          "type": "string"
        },
        {
          "name": "roles",
          "type": "json"
        },
        {
          "name": "blocked",
          "type": "boolean",
          "readOnly": true
        },
        {
          "name": "blockedReason",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "blockedAt",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "mfaEnabled",
          "type": "boolean",
          "readOnly": true
        },
        {
          "name": "version",
          "type": "number",
          "readOnly": true
        },
        {
          "name": "createdAt",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "updatedAt",
          "type": "string",
          "readOnly": true
        },
        {
          "name": "password",
          "type": "string",
          "writeOnly": true
        }
      ],
      "group": "system",
      "titleField": "email"
    },
    {
      "name": "health",
      "path": "health",
      "label": {
        "singular": "res.health.singular",
        "plural": "res.health.plural"
      },
      "capabilities": [
        {
          "name": "list",
          "kind": "list",
          "method": "GET",
          "path": "/health",
          "roles": [
            "public",
            "system:admin"
          ]
        }
      ],
      "fields": [
        {
          "name": "ok",
          "type": "boolean",
          "readOnly": true
        }
      ]
    }
  ],
  "capabilities": [
    {
      "name": "options",
      "kind": "action",
      "method": "GET",
      "path": "/system/auth/flow/options",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.options",
      "target": [
        "collection"
      ]
    },
    {
      "name": "start",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/flow/start",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.start",
      "target": [
        "collection"
      ],
      "input": {
        "fields": [
          {
            "name": "method",
            "type": "string",
            "required": true
          }
        ]
      }
    },
    {
      "name": "step",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/flow/step",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.step",
      "target": [
        "collection"
      ],
      "input": {
        "fields": [
          {
            "name": "method",
            "type": "string",
            "required": true
          },
          {
            "name": "flow",
            "type": "string"
          },
          {
            "name": "action",
            "type": "enum"
          },
          {
            "name": "code",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "challenge",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/flow/challenge",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.challenge",
      "target": [
        "collection"
      ],
      "input": {
        "fields": [
          {
            "name": "method",
            "type": "string",
            "required": true
          },
          {
            "name": "flow",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "cancel",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/flow/cancel",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.cancel",
      "target": [
        "collection"
      ],
      "input": {
        "fields": [
          {
            "name": "flow",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "return",
      "kind": "action",
      "method": "GET",
      "path": "/system/auth/flow/return/:method",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.return",
      "target": [
        "row"
      ]
    },
    {
      "name": "logout",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/logout",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.logout",
      "target": [
        "collection"
      ]
    },
    {
      "name": "refresh-token",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/refresh-token",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.refresh-token",
      "target": [
        "collection"
      ]
    },
    {
      "name": "me",
      "kind": "action",
      "method": "GET",
      "path": "/system/auth/me",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.me",
      "target": [
        "collection"
      ]
    },
    {
      "name": "sessions",
      "kind": "action",
      "method": "GET",
      "path": "/system/auth/sessions",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.sessions",
      "target": [
        "collection"
      ]
    },
    {
      "name": "sessions_delete",
      "kind": "action",
      "method": "DELETE",
      "path": "/system/auth/sessions/:id",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.sessions_delete",
      "target": [
        "row"
      ]
    },
    {
      "name": "account-creation",
      "kind": "action",
      "method": "GET",
      "path": "/system/account-creation",
      "roles": [
        "system:operator",
        "system:auditor",
        "system:admin"
      ],
      "label": "action.system.account-creation",
      "target": [
        "collection"
      ]
    },
    {
      "name": "account-creation_put",
      "kind": "action",
      "method": "PUT",
      "path": "/system/account-creation",
      "roles": [
        "system:operator",
        "system:admin"
      ],
      "label": "action.system.account-creation_put",
      "target": [
        "collection"
      ],
      "input": {
        "fields": [
          {
            "name": "allowed",
            "type": "json",
            "required": true
          },
          {
            "name": "default",
            "type": "enum",
            "required": true
          }
        ]
      }
    },
    {
      "name": "account-creation_delete",
      "kind": "action",
      "method": "DELETE",
      "path": "/system/account-creation",
      "roles": [
        "system:operator",
        "system:admin"
      ],
      "label": "action.system.account-creation_delete",
      "target": [
        "collection"
      ]
    },
    {
      "name": "manifest",
      "kind": "action",
      "method": "GET",
      "path": "/system/manifest",
      "roles": [
        "system:operator",
        "system:auditor",
        "system:admin"
      ],
      "label": "action.system.manifest",
      "target": [
        "collection"
      ]
    },
    {
      "name": "setup",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/mfa/setup",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.setup",
      "target": [
        "collection"
      ]
    },
    {
      "name": "enable",
      "kind": "action",
      "method": "POST",
      "path": "/system/auth/mfa/enable",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.system.enable",
      "target": [
        "collection"
      ]
    },
    {
      "name": "control",
      "kind": "action",
      "method": "GET",
      "path": "/probe/control",
      "roles": [
        "public",
        "system:admin"
      ],
      "label": "action.probe.control",
      "target": [
        "collection"
      ]
    }
  ]
}

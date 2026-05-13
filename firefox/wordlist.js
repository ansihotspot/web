// Wordlist par defaut pour le bruteforce d'endpoints.
// Mix de segments REST generiques et de segments observes / probables
// sur l'API Starlink.

window.DEFAULT_WORDLIST = [
  // Ressources de compte
  "accounts", "account", "users", "user", "customers", "customer", "members", "member",
  "profile", "profiles", "details", "info", "settings", "preferences",
  "customer-details", "user-details", "account-details",

  // Verification & KYC
  "obligations", "travel-obligations", "verification", "verifications",
  "verify", "kyc", "identity", "passport", "documents", "document",
  "uploads", "upload", "files", "file",

  // Souscriptions & forfaits
  "subscriptions", "subscription", "products", "product", "plans", "plan",
  "service-line", "service-lines", "line", "lines", "terminals", "terminal",
  "devices", "device", "modems", "dishes",

  // Configurations & regions
  "config", "configuration", "configurations", "region", "regions",
  "country", "countries", "locale", "locales", "languages",
  "country-product-mappings", "is-sla-product", "mappings", "mapping",

  // Facturation & paiements
  "billing", "invoices", "invoice", "payments", "payment", "transactions",
  "transaction", "balance", "credit", "refunds", "refund", "charges",
  "cards", "card", "payment-methods", "bank-accounts",

  // Adresses & livraison
  "address", "addresses", "shipping", "delivery", "locations", "location",

  // Tickets & support
  "tickets", "ticket", "support", "cases", "case", "issues", "issue",
  "messages", "message", "notifications", "notification", "alerts", "alert",

  // Auth & sessions
  "auth", "login", "logout", "register", "signup", "signin", "signout",
  "sessions", "session", "tokens", "token", "refresh", "sso", "oauth",
  "password", "reset-password", "forgot-password", "mfa", "totp", "otp",

  // Versionning & meta
  "v1", "v2", "v3", "v4", "public", "internal", "private", "admin",
  "api", "health", "ping", "status", "version", "info",

  // Operations CRUD
  "create", "update", "delete", "remove", "list", "search", "query",
  "filter", "export", "import", "download", "upload",
  "activate", "deactivate", "enable", "disable", "suspend", "resume",
  "pause", "start", "stop", "restart", "reset", "refresh",
  "confirm", "cancel", "approve", "reject", "submit", "validate",
  "assign", "unassign", "link", "unlink", "attach", "detach",
  "lock", "unlock", "archive", "restore",

  // Specifique Starlink (vu dans le webagg)
  "webagg", "agg", "sla", "referral", "referrals", "promotions", "promotion",
  "trial", "trials", "roaming", "global", "regional", "fixed", "mobile",
  "residential", "business", "maritime", "aviation",

  // Equipement / installation
  "install", "installation", "shipment", "shipments", "tracking",
  "orders", "order", "cart", "checkout",

  // Donnees & telemetrie
  "telemetry", "stats", "statistics", "usage", "metrics", "events",
  "history", "logs", "log", "audit", "activity",

  // Reseau & connectivite
  "network", "networks", "connection", "connections", "outage", "outages",
  "incident", "incidents", "maintenance",

  // Misc
  "test", "debug", "ops", "internal-ops"
];

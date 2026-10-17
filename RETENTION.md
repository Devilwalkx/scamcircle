# Retention (draft)

> I have **not** chosen or justified any retention period, and no statutory period is claimed. This documents what the *build* does by default.

| Data | Kept for | Ends when |
|---|---|---|
| Cases, findings, contacts, keys, requests, replies | until the user deletes them | user deletes a case/contact/request, or "Erase everything", or uninstalls the app |
| Share/reply/stop code text | not stored by the app after it is shown (the request record keeps the shared text and expiry) | request or case deleted |
| Screenshot | in memory only while typing | screen closed. Temporary re-encoded copy in app cache is not deleted by ScamCircle (OPEN) |
| Deletion tombstones (id + time only) | kept inside the vault so deleted items are not resurrected by restoring an old backup | erase everything |
| Seen message ids (last 500) | for replay protection | erase everything |
| Backups made by the user | wherever the user stored them | out of the app's control; deleting in the app does not delete a backup the user kept |
| Recovery secret | shown once, never stored | n/a |
| Expiry of a request | chosen per share (1, 3 or 7 days) and enforced by each phone's clock | expiry only stops use in the app, it does not delete the reviewer's stored text unless they delete it, or a stop code is imported |
| Logs / analytics / crash reports | none | n/a |

OPEN: a real service would need a justified schedule per purpose, including backups and the reviewer's side, and statements about data beyond use.

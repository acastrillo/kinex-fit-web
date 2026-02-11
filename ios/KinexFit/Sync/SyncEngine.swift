import Foundation
import GRDB

final class SyncEngine {
    private let database: AppDatabase
    private let apiClient: APIClient

    init(database: AppDatabase, apiClient: APIClient) {
        self.database = database
        self.apiClient = apiClient
    }

    func enqueueChange(entity: String, operation: String, payload: String?) throws {
        try database.dbQueue.write { db in
            try db.execute(
                sql: """
                INSERT INTO sync_queue (entity, operation, payload, createdAt, retryCount)
                VALUES (?, ?, ?, ?, ?)
                """,
                arguments: [entity, operation, payload, Date(), 0]
            )
        }
    }
}

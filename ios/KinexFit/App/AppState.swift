import Combine
import SwiftUI

@MainActor
final class AppState: ObservableObject {
    let environment: AppEnvironment

    /// Service for managing Instagram imports from Share Extension
    let instagramImportService = InstagramImportService()

    init(environment: AppEnvironment = .live) {
        self.environment = environment

        // Ensure App Group directories exist
        AppGroup.ensureDirectoriesExist()
    }

    /// Check for pending imports (call on app activation)
    func checkForPendingImports() {
        instagramImportService.refreshPendingImports()
    }
}

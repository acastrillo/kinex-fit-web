import SwiftUI

enum SyncStatus {
    case idle
    case syncing
    case success
    case error
}

struct SyncStatusIndicator: View {
    let status: SyncStatus
    let pendingCount: Int
    let failedCount: Int
    let onTap: () -> Void

    @State private var rotation: Double = 0

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                // Icon
                statusIcon
                    .font(.caption)
                    .foregroundStyle(statusColor)

                // Badge with count
                if pendingCount > 0 || failedCount > 0 {
                    Text("\(pendingCount)")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(statusColor)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(statusBackgroundColor)
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch status {
        case .idle:
            Image(systemName: "arrow.triangle.2.circlepath")

        case .syncing:
            Image(systemName: "arrow.triangle.2.circlepath")
                .rotationEffect(.degrees(rotation))
                .onAppear {
                    withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                        rotation = 360
                    }
                }

        case .success:
            Image(systemName: "checkmark.circle.fill")

        case .error:
            Image(systemName: "exclamationmark.triangle.fill")
        }
    }

    private var statusColor: Color {
        switch status {
        case .idle: return .secondary
        case .syncing: return .blue
        case .success: return .green
        case .error: return .orange
        }
    }

    private var statusBackgroundColor: Color {
        switch status {
        case .idle: return Color(.systemGray6)
        case .syncing: return Color.blue.opacity(0.15)
        case .success: return Color.green.opacity(0.15)
        case .error: return Color.orange.opacity(0.15)
        }
    }
}

// MARK: - Sync Status Banner

struct SyncStatusBanner: View {
    let pendingCount: Int
    let failedCount: Int
    let onRetry: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: failedCount > 0 ? "exclamationmark.triangle.fill" : "arrow.triangle.2.circlepath")
                .foregroundStyle(failedCount > 0 ? .orange : .blue)

            // Message
            VStack(alignment: .leading, spacing: 2) {
                if failedCount > 0 {
                    Text("Sync failed for \(failedCount) item\(failedCount == 1 ? "" : "s")")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text("Tap to retry")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else if pendingCount > 0 {
                    Text("\(pendingCount) item\(pendingCount == 1 ? "" : "s") waiting to sync")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text("Connect to internet to sync")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Action button
            if failedCount > 0 {
                Button("Retry") {
                    onRetry()
                }
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.blue)
            }

            // Dismiss button
            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
        .padding(.horizontal)
    }
}

// MARK: - Preview

#Preview("Sync Indicator") {
    VStack(spacing: 20) {
        SyncStatusIndicator(status: .idle, pendingCount: 0, failedCount: 0, onTap: {})
        SyncStatusIndicator(status: .syncing, pendingCount: 3, failedCount: 0, onTap: {})
        SyncStatusIndicator(status: .success, pendingCount: 0, failedCount: 0, onTap: {})
        SyncStatusIndicator(status: .error, pendingCount: 0, failedCount: 2, onTap: {})
    }
    .padding()
}

#Preview("Sync Banner") {
    VStack {
        SyncStatusBanner(pendingCount: 3, failedCount: 0, onRetry: {}, onDismiss: {})
        SyncStatusBanner(pendingCount: 0, failedCount: 2, onRetry: {}, onDismiss: {})
    }
}

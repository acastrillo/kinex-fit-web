import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var authViewModel: AuthViewModel

    init(environment: AppEnvironment) {
        _authViewModel = StateObject(wrappedValue: AuthViewModel(
            authService: environment.authService,
            userRepository: environment.userRepository
        ))
    }

    var body: some View {
        Group {
            switch authViewModel.authState {
            case .unknown:
                SplashView()

            case .signedOut:
                SignInView(viewModel: authViewModel)

            case .signedIn:
                MainTabView(authViewModel: authViewModel)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authViewModel.authState)
        .task {
            await authViewModel.checkExistingSession()
        }
    }
}

// MARK: - Splash View

private struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "figure.run.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(AppTheme.accent)

            Text("Kinex Fit")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(AppTheme.primaryText)

            ProgressView()
                .tint(AppTheme.accent)
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
    }
}

// MARK: - Preview

#Preview("Signed Out") {
    RootView(environment: .preview)
        .environmentObject(AppState(environment: .preview))
}

#Preview("Signed In") {
    let env = AppEnvironment.preview
    return MainTabView(authViewModel: .previewSignedIn)
        .environmentObject(AppState(environment: env))
}

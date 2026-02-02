import UIKit

@available(iOS 13.0, *)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }
    
    // For Expo apps, the window is already set up in AppDelegate
    // We just need to assign it to the scene
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      window = appDelegate.window
      window?.windowScene = windowScene
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    // Called when the scene is being released by the system
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    // Called when the scene has moved from an inactive state to an active state
  }

  func sceneWillResignActive(_ scene: UIScene) {
    // Called when the scene will move from an active state to an inactive state
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    // Called when the scene will enter the foreground
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    // Called when the scene has entered the background
  }
}

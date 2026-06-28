import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        handleShareInput()
    }
    
    private func handleShareInput() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }
        
        let urlType = UTType.url.identifier
        let textType = UTType.text.identifier
        var foundShare = false
        
        // 1. Try to find a URL attachment first
        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(urlType) {
                foundShare = true
                provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] (item, error) in
                    DispatchQueue.main.async {
                        if let url = item as? URL {
                            self?.redirectToMainApp(with: url.absoluteString)
                        } else if let urlString = item as? String {
                            self?.redirectToMainApp(with: urlString)
                        } else {
                            self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                        }
                    }
                }
                break
            }
        }
        
        // 2. If no URL is found, check for plain text (Instagram shares text which contains the URL)
        if !foundShare {
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(textType) {
                    foundShare = true
                    provider.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] (item, error) in
                        DispatchQueue.main.async {
                            if let text = item as? String {
                                self?.redirectToMainApp(with: text)
                            } else {
                                self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                            }
                        }
                    }
                    break
                }
            }
        }
        
        if !foundShare {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
    
   private func redirectToMainApp(with sharedText: String) {
        let extractedUrl = extractUrl(from: sharedText) ?? sharedText
        
        guard let encodedUrl = extractedUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let appUrl = URL(string: "vibiy://share?url=\(encodedUrl)") else {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }
        
        // Walk the responder chain to find the UIApplication instance
        var opened = false
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                opened = true
                // Call the modern, non-deprecated open method (fully supported in iOS 18)
                application.open(appUrl, options: [:]) { [weak self] _ in
                    self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                }
                break
            }
            responder = responder?.next
        }
        
        if !opened {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
    
  private func extractUrl(from text: String) -> String? {
          let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
          let matches = detector?.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
          
          if let firstMatch = matches?.first, let range = Range(firstMatch.range, in: text) {
              return String(text[range])
          }
          return nil
      }
}

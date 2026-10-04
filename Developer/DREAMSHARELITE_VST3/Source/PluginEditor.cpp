#include "PluginEditor.h"
#include <cstring>
#include <iterator>
#if JUCE_WINDOWS
 #include <windows.h>
#endif

juce::File DreamShareLiteWebView::getResourcesDirectory()
{
#if JUCE_WINDOWS
    // Locate OUR DLL, rather than FL Studio.exe or its working directory.
    static const int moduleAnchor = 0;
    HMODULE module = nullptr;
    if (GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS
                          | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                          reinterpret_cast<LPCWSTR>(&moduleAnchor), &module))
    {
        wchar_t path[32768] {};
        const auto count = GetModuleFileNameW(module, path, static_cast<DWORD>(std::size(path)));
        if (count > 0 && count < std::size(path))
            return juce::File(juce::String(path, static_cast<int>(count)))
                .getParentDirectory().getParentDirectory().getChildFile("Resources");
    }
#endif
    return {};
}

juce::WebBrowserComponent::Resource DreamShareLiteWebView::getHtmlResource()
{
    const auto html = getResourcesDirectory().getChildFile("DREAMSHARELITE.html");
    juce::MemoryBlock bytes;
    if (!html.loadFileAsData(bytes) || bytes.getSize() == 0)
    {
        const juce::String errorPage =
            "<!doctype html><html><meta charset='utf-8'><body style='background:#0a080a;"
            "color:#f2ece8;font:16px sans-serif;padding:24px'><h2>DREAMSHARELITE.html is missing</h2>"
            "<p>Close FL Studio and reinstall DREAMSHARELITE. The HTML must be inside "
            "DREAMSHARELITE.vst3/Contents/Resources.</p></body></html>";
        bytes.replaceAll(errorPage.toRawUTF8(), errorPage.getNumBytesAsUTF8());
    }
    juce::WebBrowserComponent::Resource resource;
    resource.mimeType = "text/html; charset=utf-8";
    resource.data.resize(bytes.getSize());
    std::memcpy(resource.data.data(), bytes.getData(), bytes.getSize());
    return resource;
}

juce::WebBrowserComponent::Options DreamShareLiteWebView::makeOptions()
{
    auto profile = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
        .getChildFile("dreamdaw/DREAMSHARELITE/WebView2");
    profile.createDirectory();
    const auto windowsOptions = juce::WebBrowserComponent::Options::WinWebView2{}
        .withUserDataFolder(profile)
        .withStatusBarDisabled()
        .withBackgroundColour(juce::Colour(0xff0a080a));
    return juce::WebBrowserComponent::Options{}
        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options(windowsOptions)
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withResourceProvider([](const juce::String& path)
            -> std::optional<juce::WebBrowserComponent::Resource>
        {
            const auto name = path.upToFirstOccurrenceOf("?", false, false).trimCharactersAtStart("/");
            if (name.isEmpty() || name == "index.html" || name == "DREAMSHARELITE.html")
                return getHtmlResource();
            return std::nullopt;
        });
}

DreamShareLiteWebView::DreamShareLiteWebView()
    : juce::WebBrowserComponent(makeOptions())
{
    setOpaque(true);
    goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
}

bool DreamShareLiteWebView::pageAboutToLoad(const juce::String& url)
{
    // Fetches to DreamShare's API stay in the HTML. No homepage redirect.
    return url.startsWith(juce::WebBrowserComponent::getResourceProviderRoot())
        || url == "about:blank";
}

void DreamShareLiteWebView::newWindowAttemptingToLoad(const juce::String& url)
{
    if (url.startsWithIgnoreCase("https://"))
        juce::URL(url).launchInDefaultBrowser();
}

DreamShareLiteAudioProcessorEditor::DreamShareLiteAudioProcessorEditor(DreamShareLiteAudioProcessor& processor)
    : juce::AudioProcessorEditor(&processor)
{
    setResizable(true, true);
    setResizeLimits(360, 480, 1200, 1800);
    // Portrait by default, freely resizable for smaller screens.
    setSize(520, 780);
    if (juce::WebBrowserComponent::areOptionsSupported(DreamShareLiteWebView::makeOptions()))
    {
        webView = std::make_unique<DreamShareLiteWebView>();
        addAndMakeVisible(*webView);
    }
    else
    {
        runtimeNotice.setText("DREAMSHARE LITE requires Microsoft Edge WebView2 Runtime. "
                              "Install the x64 Evergreen Runtime, then close and reopen FL Studio.",
                              juce::dontSendNotification);
        runtimeNotice.setColour(juce::Label::textColourId, juce::Colour(0xfff2ece8));
        runtimeNotice.setJustificationType(juce::Justification::centred);
        addAndMakeVisible(runtimeNotice);
        installRuntime.onClick = [] {
            juce::URL("https://developer.microsoft.com/microsoft-edge/webview2/").launchInDefaultBrowser();
        };
        addAndMakeVisible(installRuntime);
    }
    resized();
}

void DreamShareLiteAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff0a080a));
}

void DreamShareLiteAudioProcessorEditor::resized()
{
    if (webView) webView->setBounds(getLocalBounds());
    else
    {
        auto area = getLocalBounds().reduced(24);
        runtimeNotice.setBounds(area.removeFromTop(180));
        installRuntime.setBounds(area.removeFromTop(42));
    }
}

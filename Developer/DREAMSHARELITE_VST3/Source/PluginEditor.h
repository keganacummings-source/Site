#pragma once
#include <JuceHeader.h>
#include "PluginProcessor.h"

// This component only serves the accompanying HTML and displays it in WebView2.
class DreamShareLiteWebView final : public juce::WebBrowserComponent
{
public:
    DreamShareLiteWebView();
    static juce::WebBrowserComponent::Options makeOptions();
    bool pageAboutToLoad(const juce::String& url) override;
    void newWindowAttemptingToLoad(const juce::String& url) override;
private:
    static juce::File getResourcesDirectory();
    static juce::WebBrowserComponent::Resource getHtmlResource();
};

class DreamShareLiteAudioProcessorEditor final : public juce::AudioProcessorEditor
{
public:
    explicit DreamShareLiteAudioProcessorEditor(DreamShareLiteAudioProcessor&);
    void paint(juce::Graphics&) override;
    void resized() override;
private:
    std::unique_ptr<DreamShareLiteWebView> webView;
    juce::Label runtimeNotice;
    juce::TextButton installRuntime { "Get Microsoft WebView2 Runtime" };
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DreamShareLiteAudioProcessorEditor)
};

#include "PluginProcessor.h"
#include "PluginEditor.h"

DreamShareLiteAudioProcessor::DreamShareLiteAudioProcessor()
    : juce::AudioProcessor(juce::AudioProcessor::BusesProperties()
        .withInput("Input", juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
}

void DreamShareLiteAudioProcessor::prepareToPlay(double, int)
{
}

void DreamShareLiteAudioProcessor::releaseResources()
{
}

bool DreamShareLiteAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    const auto input  = layouts.getMainInputChannelSet();
    const auto output = layouts.getMainOutputChannelSet();

    if (input != output || (output != juce::AudioChannelSet::stereo() && output != juce::AudioChannelSet::mono()))
        return false;

    return true;
}

void DreamShareLiteAudioProcessor::processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&)
{
    // DreamShare Lite is a UI-only tool. It does not generate, transform,
    // or analyse audio; the audio buses exist only for broad DAW compatibility.
}

juce::AudioProcessorEditor* DreamShareLiteAudioProcessor::createEditor()
{
    return new DreamShareLiteAudioProcessorEditor(*this);
}

// JUCE requires this factory to instantiate the processor from the VST3 entry point.
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new DreamShareLiteAudioProcessor();
}

cmake_minimum_required(VERSION 3.22)
project(DREAMSHARELITE_VST3 VERSION 2.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT DEFINED JUCE_DIR OR JUCE_DIR STREQUAL "")
    message(FATAL_ERROR "JUCE_DIR must point to a JUCE checkout (for example third_party/JUCE).")
endif()

add_subdirectory("${JUCE_DIR}" JUCE)

juce_add_plugin(DREAMSHARELITE
    COMPANY_NAME "dreamdaw"
    COMPANY_WEBSITE "https://dreamdaw.com"
    COMPANY_EMAIL "hello@dreamdaw.com"
    PRODUCT_NAME "DREAMSHARELITE"
    PLUGIN_NAME "DREAMSHARELITE"
    DESCRIPTION "DreamShare Lite HTML interface host"
    VERSION "2.1.0"
    BUNDLE_ID "com.dreamdaw.dreamsharelite"
    PLUGIN_MANUFACTURER_CODE Drdw
    PLUGIN_CODE DslT
    FORMATS VST3
    VST3_CATEGORIES "Fx Tools"
    IS_SYNTH FALSE
    IS_MIDI_EFFECT FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    NEEDS_WEBVIEW2 TRUE
    VST3_AUTO_MANIFEST TRUE
    COPY_PLUGIN_AFTER_BUILD FALSE
)

juce_generate_juce_header(DREAMSHARELITE)

target_sources(DREAMSHARELITE PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginProcessor.h
    Source/PluginEditor.cpp
    Source/PluginEditor.h
)

target_compile_features(DREAMSHARELITE PRIVATE cxx_std_20)

target_compile_definitions(DREAMSHARELITE PRIVATE
    JUCE_WEB_BROWSER=1
    JUCE_USE_WIN_WEBVIEW2=1
    JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
    JUCE_DISABLE_JUCE_VERSION_PRINTING=1
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_USE_CURL=0
)

target_link_libraries(DREAMSHARELITE PRIVATE
    juce::juce_audio_utils
    juce::juce_gui_extra
)

# The editable HTML is external to the binary and always shipped with the VST3.
add_custom_command(TARGET DREAMSHARELITE_VST3 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_FILE_DIR:DREAMSHARELITE_VST3>/../Resources"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_SOURCE_DIR}/DREAMSHARELITE.html"
        "$<TARGET_FILE_DIR:DREAMSHARELITE_VST3>/../Resources/DREAMSHARELITE.html"
    VERBATIM
)

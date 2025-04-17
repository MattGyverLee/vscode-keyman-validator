
<pre> ```
mermaid flowchart TD

  subgraph Training
    A1(["Collect Valid Keyboards"])
    A2(["Add Developer Docs & Schemas"])
    A3(["Define Templates & Model Keyboards"])
    A4(["Train/Prompt GPT on All Above"])
    A1 --> A4
    A2 --> A4
    A3 --> A4
  end

  subgraph Generation
    B1(["User Provides Alphabet + Intent"])
    B2(["Select Template Keyboard"])
    B3(["Customize Layouts"])
    B4(["GPT Generates .kmn, .kvk, .keyman-touch-layout, etc."])
    B1 --> B2 --> B3 --> B4
  end

  subgraph Validation
    C1(["Run validate.js on Project Folder"])
    C2{Any Errors?}
    C3(["Send Errors Back to GPT for Revision"])
    C4(["Repeat Generation with Fixes"])
    B4 --> C1 --> C2
    C2 -- Yes --> C3 --> C4 --> B4
  end

  subgraph Output
    D1(["Output Project to /build/ Folder"])
    D2(["Serve via Local Web Server (Keyman tools)"])
    C2 -- No --> D1 --> D2
  end

  click C1 href "validate.js" _blank
</pre>
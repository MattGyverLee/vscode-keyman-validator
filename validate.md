```mermaid
flowchart TD

  subgraph User
    U1(["Provide Alphabet, Region, and Context"])
    U2(["Choose a Template Keyboard"])
    U3(["Define Special Preferences"])
    U4(["Proof the Suggestions"])
    U5(["Test the Output Keyboard with Keyman Web Tools"])
  end

  subgraph GPT
    G1(["Suggest a Model Keyboard"])
    G2(["Modify and Adapt Template Keyboard"])
    G3(["Customize Layouts"])
    G4(["Generate .kmn, .kvk, .keyman-touch-layout, etc."])
    G5(["Run validate.js on Project Folder"])
    G6{Any Errors?}
    G7(["Send Errors Back to GPT for Revision"])
    G9(["Outline Solution"])
    G11(["Revise Solution"])
    G12(["Is Solution Acceptable"])
    G8(["Output Project to /build/ Folder"])
    G10(["Serve via Local Web Server (Keyman tools)"])
  end

  U1 --> U2 --> G1 --> G2
  U3 --> G2 --> G9 --> U4 --> G3 --> G4 --> G5 --> G6
  G6 -- Yes --> G7 --> G3
  G6 -- No --> G8 --> G10 --> U5
  U4 --> G11 --> G9
  G12 --> G3
```
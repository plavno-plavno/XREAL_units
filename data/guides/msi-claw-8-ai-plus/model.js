// The 3D model behind the guide: where it is, and which of its objects make up each part in
// the manifest. Object names are the ones build_claw.py gives them in Blender; anchors
// (Anchor_<part id>, or _1/_2 for pairs) mark where a ring or an arrow goes.
window.GUIDE_MODEL = {
  "url": "../assets/models/guides/msi-claw-8-ai-plus/msi_claw.glb",
  "parts": {
    "abxy": ["Button_A", "Button_B", "Button_X", "Button_Y", "Letter_A", "Letter_B", "Letter_X", "Letter_Y"],
    "right_stick": ["Stick_R", "StickRing_R", "StickWell_R"],
    "left_stick": ["Stick_L", "StickRing_L", "StickWell_L"],
    "dpad": ["DPad"],
    "menu_button": ["Button_Menu", "Icon_Menu"],
    "quick_settings_button": ["Button_QuickSettings", "Icon_QuickSettings"],
    "view_button": ["Button_View", "Icon_View"],
    "msi_button": ["Button_MSICenter", "Icon_MSICenter"],
    "touchscreen": ["Screen"],
    "speakers": ["Speaker_L", "Speaker_R"],
    "microphone": ["Microphone"],
    "rear_vent": [],
    "m1_button": ["Button_M1"],
    "m2_button": ["Button_M2"],
    "lb": ["Bumper_LB"],
    "rb": ["Bumper_RB"],
    "lt": ["Trigger_LT"],
    "rt": ["Trigger_RT"],
    "volume": ["Button_Volume"],
    "top_vent": [],
    "usb_c": ["Port_USBC_1", "Port_USBC_2", "Port_USBC_Tongues"],
    "power_button": ["Button_Power", "Power_Icon"],
    "card_reader": ["Card_Reader"],
    "audio_jack": ["Port_Audio"],
    "back_cover": ["Back_Cover", "Button_M1", "Button_M2"],
    "screw_1": ["Screw_1"], "screw_2": ["Screw_2"], "screw_3": ["Screw_3"],
    "screw_4": ["Screw_4"], "screw_5": ["Screw_5"], "screw_6": ["Screw_6"],
    "factory_seal": ["Factory_Seal", "Factory_Seal_Text"],
    "ssd": ["SSD"],
    "ssd_screw": ["SSD_Screw"],
    "battery": ["Battery"]
  },
  // Where a part goes when a step's scene lists it as removed: an offset in the model's own
  // frame (glTF: +X right with the screen facing you, +Y up, -Z out of the back), metres.
  "remove": {
    "screw_1": [0, 0, -0.014], "screw_2": [0, 0, -0.014], "screw_3": [0, 0, -0.014],
    "screw_4": [0, 0, -0.014], "screw_5": [0, 0, -0.014], "screw_6": [0, 0, -0.014],
    "factory_seal": [0, -0.012, -0.008],
    "back_cover": [0, 0.14, -0.03],                // up and clear of the device: the inside shows below it
    "ssd": [0.012, 0, -0.012],                     // out of its slot at 45°: rises over the heat pipe beside it
    "ssd_screw": [0, 0, -0.012]
  }
};

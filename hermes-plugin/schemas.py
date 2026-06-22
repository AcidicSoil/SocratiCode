"""Schemas exposed by the SocratiCode Hermes plugin."""

SOCRATICODE_DOCTOR = {
    "name": "socraticode_doctor",
    "description": (
        "Check whether Hermes is configured correctly for SocratiCode. "
        "Use this when SocratiCode MCP tools are missing, not connecting, or failing."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}

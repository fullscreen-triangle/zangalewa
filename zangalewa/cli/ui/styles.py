"""
Styles for the Zangalewa terminal user interface.
"""

STYLES = """
/* Main app styling */
#main_container {
    height: 1fr;
    margin: 1 2;
}

/* Input styling */
#user_input {
    dock: bottom;
    margin: 1 0;
    border: solid green;
    background: $panel;
}

/* Output styling */
.output {
    margin: 0 1;
    padding: 1;
}

.user_message {
    color: $text;
    margin-bottom: 1;
}

.assistant_message {
    color: $accent;
    margin-bottom: 1;
}

.system_message {
    color: $warning;
    margin-bottom: 1;
}

.error_message {
    color: $error;
    background: $surface-darken-1;
    margin-bottom: 1;
    padding: 1;
    border: solid $error;
}

/* Progress bar styling */
.progress_bar {
    margin: 1 0;
}

/* Code blocks */
.code {
    background: $surface-darken-2;
    color: $text;
    border: solid $primary-darken-2;
    padding: 1;
    margin: 1 0;
}
""" 
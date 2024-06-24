import streamlit as st
import random
import time

# Load words from files
def load_words_from_files(category_files):
    word_dict = {}
    for category, file in category_files.items():
        with open(file, 'r') as f:
            words = f.read().splitlines()
            random.shuffle(words)
            word_dict[category] = words
    return word_dict

# Get next set of words
def get_next_words(word_dict, categories, words_per_set=5):
    selected_words = []
    for category in categories:
        if len(word_dict[category]) < words_per_set:
            continue
        selected_words.extend(word_dict[category][:words_per_set])
        word_dict[category] = word_dict[category][words_per_set:]
    random.shuffle(selected_words)
    return selected_words[:words_per_set]

def play_sound(audio_placeholder):
	audio_placeholder.audio("./timer_sound.mp3", format='audio/mp3', autoplay = True)
    
# File paths for each category (adjust paths as necessary)
category_files = {
    "Machine Learning": "categories/machine_learning.txt",
    "Data visualisation": "categories/data_visualisation.txt",
    "Data preparation": "categories/data_prep.txt"
}

# Load words
word_dict = load_words_from_files(category_files)

st.title('30 Seconds Game')

# File uploader for custom category
uploaded_file = st.sidebar.file_uploader("Upload your own text file for a custom category", type="txt")

if uploaded_file is not None:
    custom_category_name = uploaded_file.name.replace(".txt","")
    custom_words = uploaded_file.read().decode("utf-8").splitlines()
    random.shuffle(custom_words)
    word_dict[custom_category_name] = custom_words

    # Checkbox for custom category
    if st.sidebar.checkbox(custom_category_name):
        chosen_categories = [custom_category_name]
    else:
        chosen_categories = []

else:
    chosen_categories = []

# Checkboxes for predefined categories
for category in category_files.keys():
    if st.sidebar.checkbox(category):
        chosen_categories.append(category)

# Slider to select countdown duration
countdown_duration = st.sidebar.slider('Select countdown duration (seconds)', 10, 60, 30)

if chosen_categories:
    # Initialize session state
    if 'start' not in st.session_state:
        st.session_state.start = False
    if 'timer' not in st.session_state:
        st.session_state.timer = countdown_duration
    if 'words' not in st.session_state:
        st.session_state.words = []
    if 'round' not in st.session_state:
        st.session_state.round = 0

    # Start/Next button logic
    if st.button('Start' if st.session_state.round == 0 else 'Next'):
        st.session_state.start = True
        st.session_state.timer = countdown_duration
        st.session_state.words = get_next_words(word_dict, chosen_categories)
        st.session_state.round += 1

    # Display words immediately
    st.write("Words:")
    word_placeholder = st.empty()
    with word_placeholder.container():
        for word in st.session_state.words:
            st.markdown(f"<h1 style='font-size: 30px;'>{word}</h1>", unsafe_allow_html=True)
    
    # Timer display
    timer_placeholder = st.empty()
    audio_placeholder = st.empty()
    if st.session_state.start:
        for i in range(st.session_state.timer, -1, -1):
            timer_placeholder.write(f"Time remaining: {i} seconds")
            time.sleep(1)
        st.session_state.next = False
        timer_placeholder.write("Time's up!")
		# Play sound when timer is up
        play_sound(audio_placeholder)

else:
    st.write("Please select at least one category.")

import streamlit as st
import random
import time
# extra regel

# Load words from files
def load_words_from_files(category_files):
    word_dict = {}
    for category, file in category_files.items():
        with open(file, 'r') as f:
            words = f.read().splitlines()
            random.shuffle(words)
            word_dict[category] = words
    return word_dict

# Get next set of words without repeating until all words are used
def get_next_words(word_dict, played_words_dict, categories, words_per_set=5):
    selected_words = []
    for category in categories:
        available_words = [word for word in word_dict[category] if word not in played_words_dict[category]]
        if len(available_words) < words_per_set:
            available_words += played_words_dict[category]
            played_words_dict[category] = []

        new_words = available_words[:words_per_set]
        played_words_dict[category].extend(new_words)
        selected_words.extend(new_words)
        word_dict[category] = [word for word in word_dict[category] if word not in new_words]
    
    return selected_words[:words_per_set]

# File paths for each category (adjust paths as necessary)
category_files = {
    "Machine Learning": "categories/machine_learning.txt",
    "Data visualisation": "categories/data_visualisation.txt",
    "Data preparation": "categories/data_prep.txt"
}

# Load words
word_dict = load_words_from_files(category_files)

st.title('30 Seconds game')

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
    if 'play_sound_flag' not in st.session_state:
        st.session_state.play_sound_flag = False
    if 'played_words_dict' not in st.session_state:
        st.session_state.played_words_dict = {category: [] for category in category_files.keys()}
        if uploaded_file is not None:
            st.session_state.played_words_dict[custom_category_name] = []

    # Start/Next button logic
    if st.button('Next'):
        st.session_state.start = True
        st.session_state.timer = countdown_duration
        st.session_state.words = get_next_words(word_dict, st.session_state.played_words_dict, chosen_categories)

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
        audio_placeholder.audio('timer_sound.mp3', format="audio/mpeg", autoplay = True)

else:
    st.write("Please select at least one category.")

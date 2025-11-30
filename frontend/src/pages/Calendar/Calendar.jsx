import Carousel from "../../components/Carousel/Carousel";
import Modal from "../../components/Modal/Modal";
import "./Calendar.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CATEGORY_COLORS = {
  sports: "rgba(94, 234, 212, 0.3)",
  meeting: "rgba(255, 228, 181, 0.4)",
  work: "rgba(180, 198, 255, 0.4)",
  personal: "rgba(255, 182, 193, 0.45)",
};
const CATEGORY_OPTIONS = ["personal", "work", "meeting", "sports"];
const EVENTS_API_URL = "http://10.10.91.219:8001/events";
const EVENTS_API_URL_CONFIG = "http://10.10.91.219:8001/event";

const padNumber = (value) => String(value).padStart(2, "0");

const parseServerDate = (dateString) => {
  if (!dateString) return null;
  try {
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
    return parsedDate;
  } catch (error) {
    return null;
  }
};

const normalizeServerEvents = (incomingEvents = []) =>
  incomingEvents.map((eventItem) => {
    const startDate = parseServerDate(eventItem.start_date);
    const endDate = parseServerDate(eventItem.end_date);
    return {
      ...eventItem,
      _startDate: startDate,
      _endDate: endDate,
      _localId:
        eventItem._localId ||
        eventItem.id ||
        `${eventItem.name || "event"}-${eventItem.start_date || Date.now()}`,
    };
  });

const getEventColor = (category) =>
  CATEGORY_COLORS[category] || "rgba(255, 255, 255, 0.15)";

const formatDateToServer = (date) => {
  if (!date) return "";
  return date.toISOString();
};

const getTimeInputValue = (date) => {
  if (!date) return "09:00";
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
};

const buildDateFromDayAndTime = (baseDate, timeValue) => {
  if (!baseDate) return null;
  const [hours = 0, minutes = 0] = timeValue.split(":").map(Number);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0
  );
};

const calculateDurationLabel = (startTimestamp, endTimestamp) => {
  if (!startTimestamp || !endTimestamp) return "0:01";
  const durationMs = Math.max(0, endTimestamp - startTimestamp);
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${padNumber(seconds)}`;
};

const formatSecondsToLabel = (seconds) => {
  if (Number.isNaN(seconds) || seconds == null) {
    return "0:01";
  }
  const totalSeconds = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${padNumber(secs)}`;
};

export default function Calendar() {
  const today = useMemo(() => new Date(), []);
  const initialChatMessages = useMemo(
    () => [
      {
        id: "assistant-welcome",
        role: "assistant",
        type: "text",
        text: "Hey! Ask me to summarise your upcoming week or suggest a free slot.",
      },
    ],
    []
  );
  const [focusDate, setFocusDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState("");
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [chatMessages, setChatMessages] = useState(
    initialChatMessages
  );
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [modalEvents, setModalEvents] = useState([]);
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    time: "09:00",
    category: "personal",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [removedEventIds, setRemovedEventIds] = useState([]);
  const [isSavingEvents, setIsSavingEvents] = useState(false);
  const [eventMutationError, setEventMutationError] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartRef = useRef(null);
  const audioRefs = useRef({});
  const chatBodyRef = useRef(null);
  const showSkeletonEvents = Boolean(eventsError);
  const [voiceProgress, setVoiceProgress] = useState({});
  const [voiceDurations, setVoiceDurations] = useState({});
  const [playingVoiceId, setPlayingVoiceId] = useState("");
  const modalTitle = activeDay
    ? `${MONTH_LABELS[activeDay.date.getMonth()]} ${activeDay.date.getDate()}, ${activeDay.date.getFullYear()}`
    : "";
  const isDayEditable = Boolean(activeDay) && !showSkeletonEvents;

  const currentYear = focusDate.getFullYear();
  const currentMonth = focusDate.getMonth();

  const fetchEventsData = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventsError("");
    try {
      const response = await fetch(
        `${EVENTS_API_URL}?year=${currentYear}&month=${currentMonth + 1}`
      );
      if (!response.ok) {
        throw new Error("Failed to load events");
      }
      const data = await response.json();
      const eventsTemp = data.map((eventItem) => ({
        pk: eventItem.pk,
        start_date: parseServerDate(eventItem.fields.start_date),
        end_date: parseServerDate(eventItem.fields.end_date),
        name: eventItem.fields.name,
        category: eventItem.fields.category,
      }));

      setEvents(normalizeServerEvents(eventsTemp));
    } catch (error) {
      setEvents([]);
      setEventsError(error.message || "Could not fetch events");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchEventsData();
  }, [fetchEventsData]);

  const eventsByDay = useMemo(() => {
    return events.reduce((acc, eventItem) => {
      if (
        eventItem._startDate &&
        eventItem._startDate.getFullYear() === currentYear &&
        eventItem._startDate.getMonth() === currentMonth
      ) {
        const dayNumber = eventItem._startDate.getDate();
        if (!acc[dayNumber]) {
          acc[dayNumber] = [];
        }
        acc[dayNumber].push(eventItem);
      }
      return acc;
    }, {});
  }, [currentMonth, currentYear, events]);

  useEffect(() => {
    if (!activeDay) {
      setModalEvents([]);
      return;
    }

    const dayEvents = events.filter((eventItem) => {
      if (!eventItem._startDate) return false;
      return (
        eventItem._startDate.getFullYear() ===
          activeDay.date.getFullYear() &&
        eventItem._startDate.getMonth() ===
          activeDay.date.getMonth() &&
        eventItem._startDate.getDate() === activeDay.date.getDate()
      );
    });

    setModalEvents(
      dayEvents.map((eventItem) => ({
        ...eventItem,
        _localId:
          eventItem._localId ||
          eventItem.id ||
          `${eventItem.name || "event"}-${eventItem.start_date || Date.now()}`,
      }))
    );
    setNewEventForm({
      name: "",
      time: "09:00",
      category: "personal",
    });
    setRemovedEventIds([]);
    setEventMutationError("");
  }, [activeDay, events]);

  useEffect(() => {
    const ids = new Set(chatMessages.map((message) => message.id));
    Object.keys(audioRefs.current).forEach((key) => {
      if (!ids.has(key)) {
        delete audioRefs.current[key];
      }
    });
  }, [chatMessages]);

  useEffect(() => {
    const bodyNode = chatBodyRef.current;
    if (!bodyNode) return;
    bodyNode.scrollTop = bodyNode.scrollHeight;
  }, [chatMessages, isChatting]);

  const days = useMemo(() => {
    const firstWeekday = new Date(
      currentYear,
      currentMonth,
      1
    ).getDay();
    const normalizedFirstWeekday = (firstWeekday + 6) % 7;
    const daysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();
    const prevMonthDays = new Date(
      currentYear,
      currentMonth,
      0
    ).getDate();

    const paddingStart = Array.from(
      { length: normalizedFirstWeekday },
      (_, index) => ({
        day: prevMonthDays - normalizedFirstWeekday + index + 1,
        isMuted: true,
        isToday: false,
        key: `prev-${index}`,
      })
    );

    const currentDays = Array.from(
      { length: daysInMonth },
      (_, index) => {
        const dateNumber = index + 1;
        const isToday =
          dateNumber === today.getDate() &&
          currentMonth === today.getMonth() &&
          currentYear === today.getFullYear();
        return {
          day: dateNumber,
          isMuted: false,
          isToday,
          key: `curr-${dateNumber}`,
        };
      }
    );

    const cells = [...paddingStart, ...currentDays];
    let nextDayCounter = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        day: nextDayCounter,
        isMuted: true,
        isToday: false,
        key: `next-${nextDayCounter}`,
      });
      nextDayCounter += 1;
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [currentMonth, currentYear, today]);

  const handleMonthChange = (delta) => {
    setFocusDate(
      (date) =>
        new Date(date.getFullYear(), date.getMonth() + delta, 1)
    );
  };

  const handleDayClick = (dayNumber, isMuted) => {
    if (isMuted) return;
    const date = new Date(currentYear, currentMonth, dayNumber);
    setActiveDay({
      dayNumber,
      date,
    });
  };

  const handleCloseModal = () => {
    setActiveDay(null);
    setModalEvents([]);
    setNewEventForm({
      name: "",
      time: "09:00",
      category: "personal",
    });
    setRemovedEventIds([]);
    setEventMutationError("");
  };

  const sendMessageToAssistant = async (message) => {
    try {
      const response = await fetch(
        "http://10.10.82.83:8000/ask_text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: message }),
        }
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      console.log(data);

      return (
        data.answer ||
        "I'll keep that noted for when the AI comes online."
      );
    } catch (error) {
      return "I'll keep that noted until the live AI is connected.";
    }
  };

  const handleSendChat = async (event) => {
    event.preventDefault();

    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage || isChatting) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      type: "text",
      text: trimmedMessage,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    const assistantResponse =
      await sendMessageToAssistant(trimmedMessage);
    console.log(assistantResponse);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        type: "text",
        text: assistantResponse,
      },
    ]);
    setIsChatting(false);
    window.location.reload();
  };

  const handleClearChat = () => {
    if (isChatting) return;
    setChatMessages(initialChatMessages);
  };

  const uploadVoiceMessage = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-message.mp3");
    const response = await fetch(
      "http://10.10.82.83:8000/ask_audio",
      {
        method: "POST",
        body: formData,
      }
    );
    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data;
  };

  const handleVoiceMessageReady = async (
    audioBlob,
    durationLabel
  ) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const messageId = `voice-${Date.now()}`;
    const voiceMessage = {
      id: messageId,
      role: "user",
      type: "voice",
      audioUrl,
      duration: durationLabel,
      text: "",
    };
    setChatMessages((prev) => [...prev, voiceMessage]);
    setIsChatting(true);
    try {
      const data = await uploadVoiceMessage(audioBlob);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          type: "text",
          text:
            data.answer ||
            "I received your voice message and will remember it.",
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          type: "text",
          text: "I couldn't upload that voice message. Please try again.",
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleStopRecordingStream = () => {
    if (mediaRecorderRef.current) {
      const tracks = mediaRecorderRef.current.stream?.getTracks();
      tracks?.forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
  };

  const handleStartRecording = async () => {
    setRecordingError("");
    // if (!navigator.mediaDevices?.getUserMedia) {
    //   setRecordingError(
    //     "Microphone access is not supported in this browser."
    //   );
    //   return;
    // }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartRef.current = Date.now();

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        handleStopRecordingStream();
        const durationLabel = calculateDurationLabel(
          recordingStartRef.current,
          Date.now()
        );
        handleVoiceMessageReady(audioBlob, durationLabel);
        setIsRecording(false);
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      setRecordingError("Microphone permission denied.");
      handleStopRecordingStream();
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else if (!isChatting) {
      handleStartRecording();
    }
  };

  const handleVoiceLoaded = (messageId, event) => {
    const duration = event.currentTarget.duration;
    if (Number.isFinite(duration)) {
      setVoiceDurations((prev) => ({
        ...prev,
        [messageId]: duration,
      }));
    }
  };

  const handleVoiceTimeUpdate = (messageId, event) => {
    const duration =
      event.currentTarget.duration || voiceDurations[messageId] || 1;
    const currentTime = event.currentTarget.currentTime;
    setVoiceProgress((prev) => ({
      ...prev,
      [messageId]: Math.min(
        100,
        Math.max(0, (currentTime / duration) * 100)
      ),
    }));
  };

  const handleVoiceEnded = (messageId) => {
    if (playingVoiceId === messageId) {
      setPlayingVoiceId("");
    }
    setVoiceProgress((prev) => ({
      ...prev,
      [messageId]: 0,
    }));
  };

  const handleToggleVoicePlayback = (messageId) => {
    const audioElement = audioRefs.current[messageId];
    if (!audioElement) return;

    if (playingVoiceId && playingVoiceId !== messageId) {
      const previousAudio = audioRefs.current[playingVoiceId];
      if (previousAudio) {
        previousAudio.pause();
        previousAudio.currentTime = 0;
      }
      setVoiceProgress((prev) => ({
        ...prev,
        [playingVoiceId]: 0,
      }));
    }

    if (audioElement.paused) {
      audioElement.play();
      setPlayingVoiceId(messageId);
    } else {
      audioElement.pause();
      setPlayingVoiceId("");
    }
  };

  const handleModalEventChange = (eventId, field, value) => {
    setModalEvents((prev) =>
      prev.map((eventItem) => {
        if (eventItem._localId !== eventId) return eventItem;
        if (field === "time" && activeDay) {
          const updatedDate = buildDateFromDayAndTime(
            activeDay.date,
            value
          );
          return {
            ...eventItem,
            _startDate: updatedDate,
            _endDate: updatedDate,
            start_date: formatDateToServer(updatedDate),
            end_date: formatDateToServer(updatedDate),
          };
        }
        return {
          ...eventItem,
          [field]: value,
        };
      })
    );
  };

  const handleDeleteModalEvent = (eventId) => {
    const deletedEvent = modalEvents.find(
      (eventItem) => eventItem._localId === eventId
    );
    setModalEvents((prev) =>
      prev.filter((eventItem) => eventItem._localId !== eventId)
    );
    setRemovedEventIds((prev) => {
      if (deletedEvent?.id && !prev.includes(deletedEvent.id)) {
        return [...prev, deletedEvent.id];
      }
      return prev;
    });
  };

  const handleAddModalEvent = (event) => {
    event.preventDefault();
    if (!activeDay || !newEventForm.name.trim()) {
      return;
    }
    const baseDate = buildDateFromDayAndTime(
      activeDay.date,
      newEventForm.time
    );
    const newEvent = {
      id: undefined,
      name: newEventForm.name.trim(),
      category: newEventForm.category,
      start_date: formatDateToServer(baseDate),
      end_date: formatDateToServer(baseDate),
      _startDate: baseDate,
      _endDate: baseDate,
      _localId: `local-${Date.now()}-${Math.random()}`,
    };
    console.log(newEvent);

    setModalEvents((prev) => [...prev, newEvent]);
    setNewEventForm((prev) => ({
      ...prev,
      name: "",
    }));
  };

  const handleSaveModalEvents = async () => {
    if (!activeDay || isSavingEvents) return;

    /*
    name
    start_date
    end_date
    desc(optional)
    category
     */
    const buildPayload = (eventItem) => {
      const startDate =
        eventItem._startDate ||
        buildDateFromDayAndTime(
          activeDay.date,
          eventItem.time || "09:00"
        );
      const endDate = eventItem._endDate || startDate;
      return {
        name: eventItem.name || "Untitled event",
        category: eventItem.category || "personal",
        start_date: formatDateToServer(startDate),
        end_date: formatDateToServer(endDate),
      };
    };

    setIsSavingEvents(true);
    setEventMutationError("");
    try {
      const deletionPromises = removedEventIds.map(
        async (eventId) => {
          const response = await fetch(
            `${EVENTS_API_URL_CONFIG}/delete/${eventId}`,
            {
              method: "DELETE",
            }
          );
          if (!response.ok) {
            throw new Error("Failed to delete one of the events");
          }
        }
      );

      const upsertPromises = modalEvents.map(async (eventItem) => {
        const payload = buildPayload(eventItem);
        console.log(payload);

        const isUpdate = Boolean(eventItem.id);
        const response = await fetch(
          isUpdate
            ? `${EVENTS_API_URL_CONFIG}/update/${eventItem.id}`
            : `${EVENTS_API_URL_CONFIG}/create`,
          {
            method: isUpdate ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to save one of the events");
        }
      });

      await Promise.all([...deletionPromises, ...upsertPromises]);
      await fetchEventsData();
      handleCloseModal();
    } catch (error) {
      setEventMutationError(error.message || "Could not save events");
    } finally {
      setIsSavingEvents(false);
    }
  };

  return (
    <section className='hero-container'>
      <div className='hero-left'>
        <div className='calendar-container'>
          <div className='calendar-wrapper'>
            <header className='calendar-header'>
              <div>
                <div className='calendar-header__month'>
                  {MONTH_LABELS[currentMonth]}
                </div>
                <div className='calendar-header__year'>
                  {currentYear}
                </div>
              </div>
              <div className='calendar-controls'>
                <button
                  className='calendar-nav-btn circle-btn'
                  type='button'
                  onClick={() => handleMonthChange(-1)}
                >
                  ‹
                </button>
                <button
                  className='calendar-nav-btn'
                  type='button'
                  onClick={() =>
                    setFocusDate(
                      new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                      )
                    )
                  }
                >
                  Today
                </button>
                <button
                  className='calendar-nav-btn circle-btn'
                  type='button'
                  onClick={() => handleMonthChange(1)}
                >
                  ›
                </button>
              </div>
            </header>

            <div className='calendar-weekday'>
              {WEEKDAY_LABELS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className='calendar-grid'>
              {days.map((week, weekIndex) => (
                <div
                  className='calendar-week'
                  key={`week-${weekIndex}`}
                >
                  {week.map((cell) => (
                    <div
                      className={`calendar-cell ${cell.isMuted ? "is-muted" : ""} ${cell.isToday ? "is-today" : ""} ${
                        !cell.isMuted &&
                        (showSkeletonEvents ||
                          (eventsByDay[cell.day] &&
                            eventsByDay[cell.day].length))
                          ? "has-events"
                          : ""
                      }`}
                      key={cell.key}
                      onClick={() =>
                        handleDayClick(cell.day, cell.isMuted)
                      }
                      role={cell.isMuted ? undefined : "button"}
                      tabIndex={cell.isMuted ? -1 : 0}
                      onKeyDown={(event) => {
                        if (cell.isMuted) return;
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          handleDayClick(cell.day, cell.isMuted);
                        }
                      }}
                    >
                      <span className='calendar-cell__day'>
                        {cell.day}
                      </span>
                      {!cell.isMuted &&
                        (showSkeletonEvents ? (
                          <div className='calendar-events'>
                            {[0, 1].map((skeletonIndex) => (
                              <div
                                className='calendar-event-chip skeleton-chip'
                                key={`skeleton-${skeletonIndex}`}
                              >
                                <span className='calendar-event-skeleton' />
                              </div>
                            ))}
                          </div>
                        ) : (
                          eventsByDay[cell.day] && (
                            <div className='calendar-events'>
                              {eventsByDay[cell.day]
                                .slice(0, 3)
                                .map((eventItem) => {
                                  const eventTimeLabel =
                                    eventItem._startDate
                                      ? eventItem._startDate.toLocaleTimeString(
                                          [],
                                          {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )
                                      : null;
                                  return (
                                    <div
                                      className='calendar-event-chip'
                                      key={
                                        eventItem.id ||
                                        `${eventItem.name}-${eventItem.start_date}`
                                      }
                                      style={{
                                        background: getEventColor(
                                          eventItem.category
                                        ),
                                      }}
                                    >
                                      {eventTimeLabel && (
                                        <span className='calendar-event-time'>
                                          {eventTimeLabel}
                                        </span>
                                      )}
                                      <span className='calendar-event-title'>
                                        {eventItem.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              {eventsByDay[cell.day].length > 3 && (
                                <div className='calendar-event-chip more-chip'>
                                  +{eventsByDay[cell.day].length - 3}{" "}
                                  more
                                </div>
                              )}
                            </div>
                          )
                        ))}
                    </div>
                  ))}
                </div>
              ))}
              {eventsError && (
                <div className='calendar-events-error'>
                  {eventsError}
                </div>
              )}
              {isLoadingEvents && (
                <div className='calendar-events-loading'>
                  Loading events…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className='hero-right'>
        <div className='circle'>
          <Carousel
            baseWidth={400}
            autoplay={true}
            autoplayDelay={5000}
            pauseOnHover={true}
            loop={true}
            round={true}
          />
        </div>
        <div className='chat-container'>
          <div className='assistant-chat'>
            <div className='assistant-chat__header'>
              <div>
                <p className='assistant-chat__eyebrow'>Assistant</p>
                <h3>Plan helper</h3>
              </div>
              <div className='assistant-chat__controls'>
                <button
                  className='assistant-chat__clear'
                  type='button'
                  onClick={handleClearChat}
                  disabled={
                    isChatting ||
                    chatMessages.length === initialChatMessages.length
                  }
                >
                  Clear
                </button>
                <span className='assistant-chat__status'>
                  <span className='assistant-chat__dot' />{" "}
                  {isChatting ? "typing" : "idle"}
                </span>
              </div>
            </div>
            <div className='assistant-chat__body' ref={chatBodyRef}>
              {chatMessages.map((message) => {
                const durationLabel =
                  message.audioUrl &&
                  voiceDurations[message.id] != null
                    ? formatSecondsToLabel(voiceDurations[message.id])
                    : message.duration || "0:12";
                const progressValue = voiceProgress[message.id] || 0;
                return (
                  <div
                    key={message.id}
                    className={`assistant-chat__bubble assistant-chat__bubble--${message.role} ${
                      message.type === "voice"
                        ? "assistant-chat__bubble--voice"
                        : ""
                    }`}
                  >
                    {message.type === "voice" ? (
                      <>
                        <div className='assistant-chat__voice'>
                          {message.audioUrl ? (
                            <>
                              <button
                                type='button'
                                className={`assistant-chat__voice-toggle ${
                                  playingVoiceId === message.id
                                    ? "is-playing"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleToggleVoicePlayback(
                                    message.id
                                  )
                                }
                                aria-label={
                                  playingVoiceId === message.id
                                    ? "Pause voice message"
                                    : "Play voice message"
                                }
                              >
                                {playingVoiceId === message.id
                                  ? "⏸"
                                  : "▶"}
                              </button>
                              <div className='assistant-chat__voice-track'>
                                <div
                                  className='assistant-chat__voice-progress'
                                  style={{
                                    width: `${progressValue}%`,
                                  }}
                                />
                              </div>
                              <span className='assistant-chat__voice-duration'>
                                {durationLabel}
                              </span>
                              <audio
                                className='assistant-chat__voice-audio'
                                src={message.audioUrl}
                                preload='metadata'
                                ref={(node) => {
                                  if (node) {
                                    audioRefs.current[message.id] =
                                      node;
                                  }
                                }}
                                onLoadedMetadata={(event) =>
                                  handleVoiceLoaded(message.id, event)
                                }
                                onTimeUpdate={(event) =>
                                  handleVoiceTimeUpdate(
                                    message.id,
                                    event
                                  )
                                }
                                onEnded={() =>
                                  handleVoiceEnded(message.id)
                                }
                              />
                            </>
                          ) : (
                            <>
                              <div className='assistant-chat__voice-wave'>
                                <span />
                              </div>
                              <span className='assistant-chat__voice-duration'>
                                {durationLabel}
                              </span>
                            </>
                          )}
                        </div>
                        {message.text && (
                          <p className='assistant-chat__voice-caption'>
                            {message.text}
                          </p>
                        )}
                      </>
                    ) : (
                      message.text
                    )}
                  </div>
                );
              })}
              {isChatting && (
                <div className='assistant-chat__bubble assistant-chat__bubble--assistant assistant-chat__bubble--typing'>
                  Thinking…
                </div>
              )}
            </div>
            <section className='form-container'>
              <form
                className='assistant-chat__form'
                onSubmit={handleSendChat}
              >
                <input
                  type='text'
                  placeholder='Ask something...'
                  value={chatInput}
                  onChange={(event) =>
                    setChatInput(event.target.value)
                  }
                  disabled={isChatting}
                />
                <button type='submit' disabled={isChatting}>
                  {isChatting ? (
                    "..."
                  ) : (
                    <i className='bx bx-up-arrow-alt submit-btn'></i>
                  )}
                </button>
              </form>
              <button
                type='button'
                className={`assistant-chat__record-btn ${isRecording ? "is-active" : ""}`}
                onClick={handleToggleRecording}
                disabled={isChatting}
                aria-pressed={isRecording}
              >
                {isRecording ? "Stop recording" : "Record voice"}
              </button>
              {recordingError && (
                <p className='assistant-chat__error'>
                  {recordingError}
                </p>
              )}
              <p className='assistant-chat__hint'>
                Limited preview · responses are suggestions
              </p>
            </section>
          </div>
        </div>
      </div>
      <Modal
        isOpen={Boolean(activeDay)}
        onClose={handleCloseModal}
        title={modalTitle}
        footer={
          isDayEditable ? (
            <div className='day-modal__footer'>
              <button
                type='button'
                className='day-modal__btn day-modal__btn--secondary'
                onClick={handleCloseModal}
                disabled={isSavingEvents}
              >
                Cancel
              </button>
              <button
                type='button'
                className='day-modal__btn day-modal__btn--primary'
                onClick={handleSaveModalEvents}
                disabled={isSavingEvents}
              >
                {isSavingEvents ? "Saving..." : "Save changes"}
              </button>
            </div>
          ) : null
        }
      >
        {!activeDay ? null : showSkeletonEvents ? (
          <div className='day-modal__empty'>
            <p>
              Events are unavailable while the server is offline. Try
              again once the connection is restored.
            </p>
          </div>
        ) : (
          <>
            {eventMutationError && (
              <p className='day-modal__error'>{eventMutationError}</p>
            )}
            <div className='day-modal__event-list'>
              {modalEvents.length ? (
                modalEvents.map((eventItem) => (
                  <div
                    className='day-modal__event-card'
                    key={eventItem._localId}
                  >
                    <div className='day-modal__event-field'>
                      <label
                        htmlFor={`event-name-${eventItem._localId}`}
                      >
                        Title
                      </label>
                      <input
                        id={`event-name-${eventItem._localId}`}
                        type='text'
                        value={eventItem.name || ""}
                        onChange={(event) =>
                          handleModalEventChange(
                            eventItem._localId,
                            "name",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div className='day-modal__event-inline'>
                      <div className='day-modal__event-field'>
                        <label
                          htmlFor={`event-time-${eventItem._localId}`}
                        >
                          Time
                        </label>
                        <input
                          id={`event-time-${eventItem._localId}`}
                          type='time'
                          value={getTimeInputValue(
                            eventItem._startDate
                          )}
                          onChange={(event) =>
                            handleModalEventChange(
                              eventItem._localId,
                              "time",
                              event.target.value
                            )
                          }
                        />
                      </div>
                      <div className='day-modal__event-field'>
                        <label
                          htmlFor={`event-category-${eventItem._localId}`}
                        >
                          Category
                        </label>
                        <select
                          id={`event-category-${eventItem._localId}`}
                          value={
                            CATEGORY_OPTIONS.includes(
                              eventItem.category
                            )
                              ? eventItem.category
                              : "personal"
                          }
                          onChange={(event) =>
                            handleModalEventChange(
                              eventItem._localId,
                              "category",
                              event.target.value
                            )
                          }
                        >
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                          {!CATEGORY_OPTIONS.includes(
                            eventItem.category
                          ) &&
                            eventItem.category && (
                              <option value={eventItem.category}>
                                {eventItem.category}
                              </option>
                            )}
                        </select>
                      </div>
                    </div>
                    <div className='day-modal__event-actions'>
                      <button
                        type='button'
                        className='day-modal__link-btn'
                        onClick={() =>
                          handleDeleteModalEvent(eventItem._localId)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className='day-modal__empty'>
                  No events scheduled for this day.
                </p>
              )}
            </div>
            <form
              className='day-modal__new-event'
              onSubmit={handleAddModalEvent}
            >
              <h3>Add new event</h3>
              <div className='day-modal__event-field'>
                <label htmlFor='new-event-title'>Title</label>
                <input
                  id='new-event-title'
                  type='text'
                  value={newEventForm.name}
                  onChange={(event) =>
                    setNewEventForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='day-modal__event-inline'>
                <div className='day-modal__event-field'>
                  <label htmlFor='new-event-time'>Time</label>
                  <input
                    id='new-event-time'
                    type='time'
                    value={newEventForm.time}
                    onChange={(event) =>
                      setNewEventForm((prev) => ({
                        ...prev,
                        time: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='day-modal__event-field'>
                  <label htmlFor='new-event-category'>Category</label>
                  <select
                    id='new-event-category'
                    value={newEventForm.category}
                    onChange={(event) =>
                      setNewEventForm((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className='day-modal__btn day-modal__btn--primary'
                type='submit'
              >
                Add event
              </button>
            </form>
          </>
        )}
      </Modal>
    </section>
  );
}

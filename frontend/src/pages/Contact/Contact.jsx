import "./Contact.css";
import { useId } from "react";

function Contact() {
  const id = useId();
  return (
    <div id={id} className='contact-container'>
      <h1 className='contact-title'>Contact Page</h1>
      <div className='contact-wrapper'>
        <p>This is the contact page of our React application.</p>
        <p>Some text</p>
      </div>
    </div>
  );
}

export default Contact;

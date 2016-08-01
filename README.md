# webrtc-videochat
This is a simple video-chat application using webrtc. The signalling operator is taken care with a java server

To run it:
1. run the server: compile and run /server/BeingThereOperator.java
 * you'll see an operator window with 3 columns and a connect/disconnect button.
 * The first two columns indicate the source and sink of the stream
 * The last column indicate established connection between source and sink
2. view the index.html in your browser. 
 * The are two modes: camera and display.
  * camera(source) stream to the display(sink).
  * display(sink) receive the stream from the camera(source) 
 * 2D and stereo modes are supported.
 * under _Operator_ field, insert the ip address and port number for the operator. The default is for localhost.

## To initiate a two-ways chat:
* You need to start both camera and display mode (open it in multiple browser tab) for both parties
* Operator needs to connect the corresponding camera and display for both parties.

<unlicensed>
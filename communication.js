//set the callback for page unloading where all the cleanup happens
window.onbeforeunload = cleanup;

//callback for swapping streams
document.addEventListener("keydown", function(e){
	if(getType()==1)
	{
		var ind = e.keyCode-49;
		if(ind>=0 && ind<9 && webRTCConnections.length>ind && webRTCConnections[ind].getRemoteStreams().length>0)
		{	
			setVideoStream(webRTCConnections[ind].getRemoteStreams()[0]);
			setFormat(webRTCConnectionTypes[ind]==2, webRTCConnectionTypes[ind]==3, getFormat()==2, getFormat()==3);
		}
	}}, false);


//decode get parameters
HTTP_GET_VARS=new Array();
strGET=document.location.search.substr(1,document.location.search.length);
if(strGET!='')
{
	gArr=strGET.split('&');
	for(i=0;i<gArr.length;++i)	
	{
		v='';
		vArr=gArr[i].split('=');
		if(vArr.length>1){v=vArr[1];}
		HTTP_GET_VARS[unescape(vArr[0])]=unescape(v);
	}
}
function GET(v)
{
	if(!HTTP_GET_VARS[v]){return '';}
	return HTTP_GET_VARS[v];
}

var operatorURL  = GET('operator');
if(operatorURL=='')
{
	operatorURL = '127.0.0.1:4862';
}

//initialize the web form and related callbacks
document.getElementById('form').style.display = 'block';
document.InputForm.RegisterButton.onclick = registerButtonClick;
document.InputForm.OperatorTextField.value = operatorURL;
for(var i = 0; i < document.InputForm.DeviceTypeRadioButton.length; i++)
{
	document.InputForm.DeviceTypeRadioButton[i].onclick = updateWebForm;
}
updateWebForm();

//initialize stuff for video
var video = document.getElementById("video");

//websocket will be initialized on each register click
var webSocket = null;

//initialize an array for all peer2peer connections
//and a field to remember the newly opened
var webRTCConnections = new Array();
var webRTCConnectionIdentifiers = new Array();
var webRTCConnectionTypes = new Array();

//global variables used for new connection creation
var newIdentifier = null;
var newConnection = null;

//stream will be created on register
var localStream = null;

function registerButtonClick()
{
	//hide the form
	document.getElementById('form').style.display = 'none';

	//get the stream, do this as first as it is user input and hence slow
	if(getType()==2)
	{
		getUserMedia({video:true, audio:true},onStream,webRTCError);
	}
	else if(getType()==1)
	{
		//DIRTY HACK: create a fake audio stream
		//a stream is required to create an offer
		//however we do not want to force the display side to also transmit unnecessary data
		var media = {};
		media.fake = media.audio = true;
		getUserMedia(media,onStream,webRTCError);
		//getUserMedia({video:true, audio:true},onStream,webRTCError);
	}
	else
	{
		alert('Unknown Device Type!');
	}

	//the acquisition side directly should show side by side if it is a stereo top bottom cam
	if(getType()==2)
	{
		setFormat(getFormat()==2, getFormat()==3, false, getFormat()==2 || getFormat()==3);
	}
}

function onStream(stream)
{
	//stream is required!
	if(stream==null)
	{
		console.log('Need a stream!');
		registerButtonClick();
	}

	//set the stream to the global variabel
	localStream = stream;

	//if we are a camera, show the local stream
	if(getType()==2)
	{
		setVideoStream(localStream);
		video.muted = true;
	}

	//open a new socket
	webSocket = new WebSocket('ws://' + document.InputForm.OperatorTextField.value);
	webSocket.onopen = webSocketOnOpen;
	webSocket.onmessage = webSocketOnMessage;
	webSocket.onerror = webSocketOnError;
	webSocket.onclose = webSocketOnClose;
}

function webSocketOnOpen()
{	
	//get the type of the device (camera or display) and the format (2D or 3D)
	var type = getType();
	var format = getFormat();

	//get some lengths
	var identifierLength = document.InputForm.NameTextField.value.length;

	//compose the message to register this client
	var bytearray = new Uint8Array(4+identifierLength);
	bytearray[0] = 42;
	bytearray[1] = type;
	bytearray[2] = format;
	for(var i=0;i<identifierLength;i++)
	{
		bytearray[3+i] = document.InputForm.NameTextField.value.charCodeAt(i);
	}
	bytearray[3+identifierLength] = 0;
		
	//register with the server
	webSocket.send(bytearray);
}

function webSocketOnMessage(event) 
{
	//decode the message
	var buffer = [];
	for(var i = 0; i < event.data.length; ++i)
	{
		buffer.push(event.data.charCodeAt(i));
	}
	
	//check consistency
	if(buffer[0]!=42){console.log('Error in Server Message (id not 42)');return;}
	if(buffer[1]<1||buffer[1]>5){console.log('Error in Server Message (invalid command)');return;}

	//decode the different commands
	if(buffer[1]==1)//request for an offer from this acquisition client
	{
		//get offer for a specific other client
		newIdentifier = '';
		var i = 0;
		var type = buffer[2];
		for(i = 3; i < buffer.length && buffer[i]!=0; i++)
		{
			newIdentifier += String.fromCharCode(buffer[i]);
		}
		if(i>=buffer.length)
		{
			console.log('Error in getOffer command (identifier not terminated)');
			return;
		}
		console.log('Compose offer for ' + newIdentifier);

		//create a new connection
		newConnection = new RTCPeerConnection(null);
		newConnection.addStream(localStream);
		newConnection.createOffer(createWebRTCOffer,webRTCError);
	}
	else if(buffer[1]==2)//request for an answer from this display client to a specific offer
	{
		//get offer for a specific other client
		newIdentifier = '';
		var i = 3;
		var format = buffer[2];
		while(buffer[i]!=0 && i<buffer.length)
		{
			newIdentifier += String.fromCharCode(buffer[i]);
			i++;
		}
		if(buffer[i]!=0){console.log('Error, identifier not 0-terminated');return;}
		i++;i++;
		var remoteOffer = '';
		while(buffer[i]!=0 && i<buffer.length)
		{
			remoteOffer += String.fromCharCode(buffer[i]);
			i++;
		}
		if(buffer[i]!=0){console.log('Error, offer not 0-terminated');return;}
		console.log('Compose answer for ' + newIdentifier);

		//create a new connection
		var jsonDescriptor = new RTCSessionDescription(JSON.parse(remoteOffer));
		newConnection = new RTCPeerConnection(null);
		newConnection.addStream(localStream);
		newConnection.onaddstream = addRemoteStream;
		webRTCConnections.push(newConnection);
		webRTCConnectionIdentifiers.push(newIdentifier);
		webRTCConnectionTypes.push(format);
		setFormat(format==2, format==3, getFormat()==2, getFormat()==3);
		newConnection.setRemoteDescription(new RTCSessionDescription(jsonDescriptor),function(){newConnection.createAnswer(createWebRTCAnswer,webRTCError);});
	}
	else if(buffer[1]==3)//setting the answer of this camera client of the remote display client
	{
		//get the answer
		var otherIdentifier = '';
		var i = 3;
		var format = buffer[2];
		while(buffer[i]!=0 && i<buffer.length)
		{
			otherIdentifier += String.fromCharCode(buffer[i]);
			i++;
		}
		if(buffer[i]!=0){console.log('Error, identifier not 0-terminated');return;}
		if(otherIdentifier != newIdentifier){console.log('Error, identifier mismatch: ' + otherIdentifier + '!=' + newIdentifier);return;}
		i++;i++;
		var remoteAnswer = '';
		while(buffer[i]!=0 && i<buffer.length)
		{
			remoteAnswer += String.fromCharCode(buffer[i]);
			i++;
		}
		if(buffer[i]!=0){console.log('Error, answer not 0-terminated');return;}

		//set the answer
		console.log('Setting answer');
		var jsonDescriptor = new RTCSessionDescription(JSON.parse(remoteAnswer));
		newConnection.setRemoteDescription(new RTCSessionDescription(jsonDescriptor));

		//set the callback to add a stream
		newConnection.onaddstream = addRemoteStream;

		//append the new connection
		webRTCConnections.push(newConnection);
		webRTCConnectionIdentifiers.push(newIdentifier );
		webRTCConnectionTypes.push(format);
		newIdentifier = '';
		newConnection = null;
	}
	else if(buffer[1]==4)//disconnect a certain identifier for both acquisition and display
	{
		var otherIdentifier = '';
		var i = 3;
		var format = buffer[2];
		while(buffer[i]!=0 && i<buffer.length)
		{
			otherIdentifier += String.fromCharCode(buffer[i]);
			i++;
		}
		if(buffer[i]!=0){console.log('Error, identifier not 0-terminated');return;}

		for(var i = 0; i < webRTCConnectionIdentifiers.length; i++)
		{
			if(webRTCConnectionIdentifiers[i]==otherIdentifier)
			{
				//close and remove the peer connection
				webRTCConnections[i].close();
				webRTCConnections.splice(i,1);
				webRTCConnectionIdentifiers.splice(i,1);
				webRTCConnectionTypes.splice(i,1);
				console.log('Disconnected ' + otherIdentifier);

				//if we are a display, show the first stream if any
				if(getType()==1 && webRTCConnections.length>0 && webRTCConnections[j].getRemoteStreams().length>0)
				{
					setVideoStream(webRTCConnections[0].getRemoteStreams()[0]);
					setFormat(webRTCConnectionTypes[0]==2, webRTCConnectionTypes[0]==3, getFormat()==2, getFormat()==3);
				}

				return;
			}
		}
		console.log('Could not disconnect ' + otherIdentifier);
	}
	else if(buffer[1]==5)//show a certain identifier's stream, only for displays
	{
		//only do it if we are a display
		if(getType()==1 && webRTCConnections.length>0)
		{
			var otherIdentifier = '';
			var i = 3;
			var format = buffer[2];
			while(buffer[i]!=0 && i<buffer.length)
			{
				otherIdentifier += String.fromCharCode(buffer[i]);
				i++;
			}
			if(buffer[i]!=0){console.log('Error, identifier not 0-terminated');return;}
			for(var j = 0; j < webRTCConnections.length; j++)
			{
				if(webRTCConnectionIdentifiers[j]==otherIdentifier && webRTCConnections[j].getRemoteStreams().length>0)
				{
					setVideoStream(webRTCConnections[j].getRemoteStreams()[0]);
					setFormat(webRTCConnectionTypes[j]==2, webRTCConnectionTypes[j]==3, getFormat()==2, getFormat()==3);
				}
			}
		}
	}
}

function createWebRTCOffer(offer)
{
	//set the descriptor to our new connection
	newConnection.setLocalDescription(new RTCSessionDescription(offer),function(){ 

	//stringify it
	offerString = JSON.stringify(offer);

	var bytearray = new Uint8Array(2+offerString.length);
	bytearray[0] = 42;
	for(var i=0;i<offerString.length;i++)
	{
		bytearray[1+i] = offerString.charCodeAt(i);
	}
	bytearray[1+offerString.length] = 0;
	
	//register with the server
	webSocket.send(bytearray);
	console.log('Sent offer for ' + newIdentifier);

	} );
}

function createWebRTCAnswer(answer)
{
	//set the descriptor to our new connection
	newConnection.setLocalDescription(new RTCSessionDescription(answer),function(){

	//stringify it
	answerString = JSON.stringify(answer);

	var bytearray = new Uint8Array(2+answerString.length);
	bytearray[0] = 42;
	for(var i=0;i<answerString.length;i++)
	{
		bytearray[1+i] = answerString.charCodeAt(i);
	}
	bytearray[1+answerString.length] = 0;

	//register with the server
	webSocket.send(bytearray);
	console.log('Sent answer for ' + newIdentifier);

	//already appended the new connection
	newIdentifier = '';
	newConnection = null;

	} );
}

function addRemoteStream(event)
{
	console.log('Got remote stream');
	if(getType()==1)//only set it if we are a display
	{
		setVideoStream(event.stream);
	}
}

function setVideoStream(stream)
{
	document.getElementById('display').style.display = 'block';
	attachMediaStream(video,stream);
}

/////////////////////
//General Functions//
/////////////////////

function webRTCError(error)
{
	console.log('WebRTC Error: ' + error);
}

function webSocketOnError(error)
{
	console.log('Websocket Error: ' + error);
}

function webSocketOnClose(event)
{
	console.log('Disconnected');
}

function getType()
{
	if(document.InputForm.DeviceTypeRadioButton[0].checked || document.InputForm.DeviceTypeRadioButton[1].checked || document.InputForm.DeviceTypeRadioButton[2].checked)
	{
		return 2;//Camera
	}
	else if(document.InputForm.DeviceTypeRadioButton[3].checked || document.InputForm.DeviceTypeRadioButton[4].checked || document.InputForm.DeviceTypeRadioButton[5].checked)
	{
		return 1;//Display
	}
	return 0;
}

function getFormat()
{
	if(document.InputForm.DeviceTypeRadioButton[0].checked || document.InputForm.DeviceTypeRadioButton[3].checked)
	{
		return 1;//Single view
	}
	if(document.InputForm.DeviceTypeRadioButton[1].checked || document.InputForm.DeviceTypeRadioButton[4].checked)
	{
		return 2;//Stereo top bottom
	}
	else if(document.InputForm.DeviceTypeRadioButton[2].checked || document.InputForm.DeviceTypeRadioButton[5].checked)
	{
		return 3;//stereo left right
	}
	return 0;
}

function updateWebForm()
{
	var clientName = GET('name');
	if(clientName!='')
	{
		document.title = clientName;
		document.InputForm.NameTextField.value = clientName;
		return;
	}

	for(var i = 0; i < document.InputForm.DeviceTypeRadioButton.length; i++)
	{
		if(document.InputForm.DeviceTypeRadioButton[i].checked)
		{
			var number = Math.floor(Math.random()*100000);
			var prefix = (number>9999)?'':((number>999)?'0':((number>99)?'00':'000'));
			document.InputForm.NameTextField.value = document.InputForm.DeviceTypeRadioButton[i].value + ' - ' + prefix + number;
			break;
		}
	}
	document.title = document.InputForm.NameTextField.value;
}

function cleanup()
{
	if(webSocket!=null)
	{
		webSocket.onclose = function(){}; //disable onclose handler first
   		webSocket.close();
		webSocket = null;
	}
}

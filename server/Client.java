public class Client
{
	public enum Type
	{
		Invalid,
	    Display,
	    Camera
	}
	
	public enum Format
	{
		Invalid,
		SingleView,
	    StereoViewTopBottom,
	    StereoViewLeftRight
	}
	
	public Client(java.net.Socket socket)
	{
		//assign the socket for later use, set the timeout and create buffers for I/O
		m_socket = socket;
		try
		{
			m_socket.setSoTimeout(m_timeOut);
		}
		catch(Exception e)
		{
			System.out.println("Could not set the socket timeout!");
			return;
		}
		try
		{
			m_inputStream = m_socket.getInputStream();
			m_outputStream = m_socket.getOutputStream();
		}
		catch(Exception e)
		{
			System.out.println("Could not create the input/output streams for a socket!");
			return;
		}
		
		//do the handshake on socket initialisation
		if(!handShake())
		{
			System.out.println("Error in WebSocket Handshake!");
			return;
		}
		
		//get the client description
		byte[] msg = getMessage();
		if(msg==null)
		{
			System.out.println("Could not get infos about the client!");
			return;
		}

		//read out the type, the format and the identifier
		//Format |  1b  |  1b  |  1b  |   ...    '\0'|   
		//		    42    type  format   identifier   
		if(	msg[0]!=42 || 
			(msg[1] != 1 && msg[1] != 2) ||
			(msg[2] != 1 && msg[2] != 2 && msg[2] != 3) ||
			msg[msg.length-1]!=0)
		{
			System.out.println("Could not read the format of the client infos!");
			return;
		}

		//we have everything, compose the required information
		m_identifier = new String(java.util.Arrays.copyOfRange(msg, 3, msg.length));
		m_type = (msg[1]==(byte)1)?Type.Display:Type.Camera;
		m_format = (msg[2]==(byte)1)?Format.SingleView:((msg[2]==(byte)2)?Format.StereoViewTopBottom:Format.StereoViewLeftRight);
		
		//state the registration
		System.out.println("Registered: \'" + m_identifier + "\'");
    }
	
	public byte[] getOffer(Client other)
	{
		if(other==null || !other.isConnectedAndValid() || m_socket==null || m_type==Type.Invalid || m_format==Format.Invalid || m_identifier==null || m_inputStream == null || m_outputStream == null)
		{
			return null;
		}
		
		//compose the message
		byte[] msg = new byte[3+other.getIdentifier().length()+1];
		msg[0] = 42;
		msg[1] = 1;
		msg[2] = (byte)((other.getFormat()==Format.SingleView)?1:((other.getFormat()==Format.StereoViewTopBottom)?2:3));
		System.arraycopy(other.getIdentifier().getBytes(), 0, msg, 3, other.getIdentifier().length());
		msg[3+other.getIdentifier().length()] = 0;
		
		//send the request for an offer
		if(!sendMessage(msg)){return null;}
		
		//get the offer
		byte[] offer = getMessage();
		if(offer==null)
		{
			return null;
		}
		
		//remove the id and the \0
		byte[] result = new byte[offer.length-2];
		System.arraycopy(offer, 1, result, 0, offer.length-2);
		
		return result;
	}
	public byte[] getAnswer(Client other, byte[] offer)
	{
		if(other==null || !other.isConnectedAndValid() || offer==null || m_socket==null || m_type==Type.Invalid || m_format==Format.Invalid || m_identifier==null || m_inputStream == null || m_outputStream == null)
		{
			return null;
		}
		
		//compose the message
		byte[] msg = new byte[3+other.getIdentifier().length()+1+offer.length+1];
		msg[0] = 42;
		msg[1] = 2;
		msg[2] = (byte)((other.getFormat()==Format.SingleView)?1:((other.getFormat()==Format.StereoViewTopBottom)?2:3));
		System.arraycopy(other.getIdentifier().getBytes(), 0, msg, 3, other.getIdentifier().length());
		msg[3+other.getIdentifier().length()] = 0;
		System.arraycopy(offer, 0, msg, 3+other.getIdentifier().length()+1, offer.length);
		msg[3+other.getIdentifier().length()+1+offer.length] = 0;
		
		//send the request for an offer
		if(!sendMessage(msg)){return null;}
		
		//get the offer
		byte[] answer = getMessage();
		if(answer==null)
		{
			return null;
		}
		
		//remove the id and the \0
		byte[] result = new byte[answer.length-2];
		System.arraycopy(answer, 1, result, 0, answer.length-2);
		
		return result;
	}
	public boolean setAnswer(Client other, byte[] answer)
	{
		if(other==null || !other.isConnectedAndValid() || answer==null || m_socket==null || m_type==Type.Invalid || m_format==Format.Invalid || m_identifier==null || m_inputStream == null || m_outputStream == null)
		{
			return false;
		}
		
		//compose the message
		byte[] msg = new byte[3+other.getIdentifier().length()+1+answer.length+1];
		msg[0] = 42;
		msg[1] = 3;
		msg[2] = (byte)((other.getFormat()==Format.SingleView)?1:((other.getFormat()==Format.StereoViewTopBottom)?2:3));
		System.arraycopy(other.getIdentifier().getBytes(), 0, msg, 3, other.getIdentifier().length());
		msg[3+other.getIdentifier().length()] = 0;
		System.arraycopy(answer, 0, msg, 3+other.getIdentifier().length()+1, answer.length);
		msg[3+other.getIdentifier().length()+1+answer.length] = 0;
		
		//send the request for an offer
		return sendMessage(msg);
	}
	public boolean disconnect(Client other)
	{
		if(other==null || !other.isConnectedAndValid() || m_socket==null || m_type==Type.Invalid || m_format==Format.Invalid || m_identifier==null || m_inputStream == null || m_outputStream == null)
		{
			return false;
		}
		
		//compose the message
		byte[] msg = new byte[3+other.getIdentifier().length()+1];
		msg[0] = 42;
		msg[1] = 4;
		msg[2] = (byte)((other.getFormat()==Format.SingleView)?1:((other.getFormat()==Format.StereoViewTopBottom)?2:3));
		System.arraycopy(other.getIdentifier().getBytes(), 0, msg, 3, other.getIdentifier().length());
		msg[3+other.getIdentifier().length()] = 0;
		
		//send the request for an offer
		return sendMessage(msg);
	}
	public boolean show(Client other)
	{
		if(other==null || !other.isConnectedAndValid() || m_socket==null || m_type==Type.Invalid || m_format==Format.Invalid || m_identifier==null || m_inputStream == null || m_outputStream == null)
		{
			return false;
		}
		
		//compose the message
		byte[] msg = new byte[3+other.getIdentifier().length()+1];
		msg[0] = 42;
		msg[1] = 5;
		msg[2] = (byte)((other.getFormat()==Format.SingleView)?1:((other.getFormat()==Format.StereoViewTopBottom)?2:3));
		System.arraycopy(other.getIdentifier().getBytes(), 0, msg, 3, other.getIdentifier().length());
		msg[3+other.getIdentifier().length()] = 0;
		
		//send the request for an offer
		return sendMessage(msg);
	}
	
 	public String getIdentifier()
	{
		return m_identifier;
	}
 	public Type getType()
	{
		return m_type;
	}
	public Format getFormat()
	{
		return m_format;
	}
	public void close()
	{
		if(m_socket==null){return;}
		try
		{
			m_socket.close();
			m_socket = null;
		}
		catch(Exception e)
		{
			System.out.println("Error in closing socket of " + m_identifier);
		}
		m_socket = null;
		m_inputStream = null;
		m_outputStream = null;
		m_identifier = null;
		m_type = Type.Invalid;
		m_format = Format.Invalid;
	}
	public boolean isConnectedAndValid()
	{
		if(m_socket==null || m_socket.isClosed() || !m_socket.isConnected())
		{
			return false;
		}
		if(m_type==Type.Invalid || m_format==Format.Invalid || m_identifier==null || m_inputStream == null || m_outputStream == null)
		{
			return false;
		}
		
		//make a test read to check if the client is still alive
		try
		{
			m_socket.setSoTimeout(1);
			try
			{
				if(m_inputStream.read()<0)
				{
					m_socket.setSoTimeout(m_timeOut);
					return false;
				}
			}
			catch(java.net.SocketTimeoutException e)
			{
				m_socket.setSoTimeout(m_timeOut);
				return true;
			}
		}
		catch(Exception e)
		{
			System.out.println("Could not do a test read!");
			return false;
		}
		
		return true;
	}
	
	@Override public String toString()
	{
		String result = (m_identifier!=null)?m_identifier:"Unknown";
		result += " (";
		result += (m_format==Format.Invalid)?"Invalid Format":((m_format==Format.SingleView)?"Single View":((m_format==Format.StereoViewLeftRight)?"Left Right":"Top Bottom"));
		result += ")";
		return result;
	}
	
	private boolean handShake()
	{
		if(m_socket==null || m_inputStream == null || m_outputStream == null)
		{
			return false;
		}
		
		//make the handshake which is required for websockets
		final int maximumMessageSize = 4096;
		byte[] handShake = new byte[maximumMessageSize];
		try
		{
			//Do the handshake
			m_inputStream.read(handShake, 0, maximumMessageSize);
			String msg = new String(handShake);
			int index = msg.indexOf("Sec-WebSocket-Key: ") + "Sec-WebSocket-Key: ".length();
			char curr = msg.charAt(index);
			String key = "";
			while(curr!='\r')
			{
				key += curr;
				index++;
				curr = msg.charAt(index);
			}
			key += m_guid;
			java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-1");
			md.update(key.getBytes("iso-8859-1"), 0, key.length());
			byte[] sha1hash = md.digest();
			sun.misc.BASE64Encoder encoder = new sun.misc.BASE64Encoder();
			String returnBase = encoder.encode(sha1hash);
			String ret = "HTTP/1.1 101 Switching Protocols\r\n";
			ret+="Upgrade: websocket\r\n";
			ret+="Connection: Upgrade\r\n";
			ret+="Sec-WebSocket-Accept: "+returnBase+"\r\n";
			ret+="\r\n";
			m_outputStream.write(ret.getBytes());
			m_outputStream.flush();
		}
		catch(Exception e)
		{		
			return false;
		}
		return true;
	}
	private byte[] getMessage()
	{
		if(m_socket==null || m_inputStream == null || m_outputStream == null)
		{
			return null;
		}
		
		//read out the header for the next packet
		final int maximumMessageSize = 4096;
		byte[] messageArray = new byte[maximumMessageSize];
		java.util.Arrays.fill(messageArray,(byte)0);
		int packageSize = 0;
		try
		{	
			//get the next package
			packageSize = m_inputStream.read(messageArray, 0, maximumMessageSize);
			if(packageSize<2)
			{
				System.out.println("Only single packets are allowed!");
				return null;
			}
		}
		catch(Exception e)
		{
			System.out.println("Could not read the package sent by the client! (" + e.getMessage() + ")");
			return null;
		}
		
		//get the Fin RSV and OpCode byte
		byte b = messageArray[0];
		boolean fin = ((b & 0x80) != 0);	        
        if(!fin)
        {
        	System.out.println("Only single frame packets are allowed!");
			return null;
        }
        
        //check if the msg is masked
        b = messageArray[1];
        boolean masked = ((b & 0x80) != 0);
        if(!masked)
        {
        	System.out.println("Client message not masked!");
			return null;
        }
        
        //get the payload length as described in http://buildnewgames.com/websockets/
        long payloadLength = (byte)(0x7F & b);
        int headerOffset = 2;
        if(payloadLength == 0x7F)
        {
            //payload is bit 16-79
        	payloadLength = 0;
        	for(int i=2; i < 10; i++)
        	{
        		payloadLength += (messageArray[i] & 0xFF) << (8 * (9-i));
        	}
        	headerOffset += 8;
        }
        else if(payloadLength == 0x7E)
        {
        	//payload is bit 16-31
        	payloadLength = 0;
        	for(int i=2; i < 4; i++)
        	{
        		payloadLength += (messageArray[i] & 0xFF) << (8 * (3-i));
        	}
        	headerOffset += 2;
        }
        
        //in case the message and the payload missmatch, receive more data
        int receivedDataSize = packageSize;
        try
        {
	        while(payloadLength != (receivedDataSize-headerOffset-4))
	        {
	        	System.out.println("Need to receive more data...");
	        	receivedDataSize += m_inputStream.read(messageArray, receivedDataSize, maximumMessageSize-receivedDataSize);
	        }
		}
		catch(Exception e)
		{
			System.out.println("Could not read the continued packages sent by the client! (" + e.getMessage() + ")");
			return null;
		}

		//decode
		byte[] mask = {	messageArray[headerOffset+0],
						messageArray[headerOffset+1],
						messageArray[headerOffset+2],
						messageArray[headerOffset+3] };
		for(int i = 0; i<payloadLength; i++)
		{
			int aa = (int)mask[i%4]&0xFF;
			int bb = (int)messageArray[i+headerOffset+4]&0xFF;
			int cc = ((aa ^ bb)&0xFF);
			messageArray[i] = (byte)cc;
		}
		
		//return the result
		return java.util.Arrays.copyOfRange(messageArray,0,(int)payloadLength);
	}
	private boolean sendMessage(byte[] msg)
	{
		if(m_socket==null || m_inputStream == null || m_outputStream == null)
		{
			return false;
		}
		
		//compose the message and make it a connect or disconnect depending on the input argument
		//Format |  1b  |  1b  |  1b  |      2b      |     ...    |      2b      |     ...    |
		//		    42  connect format     strlen      identifier      strlen       descriptor
		int payloadLength = msg.length;
		int headerLength = (payloadLength<126)?2:((payloadLength<65536)?4:10);
		byte[] message = new byte[payloadLength+headerLength];
		
		message[0] = (byte)129;//fin bit set and opcode to 0x1 for text data -> 10000001
		if(payloadLength<126)
		{
			message[1] = (byte)payloadLength;
		}
		else if(payloadLength<65536)
		{
			message[1] = (byte)126;
			message[2] = (byte)((payloadLength >> 8) & 0xff);
			message[3] = (byte)(payloadLength & 0xff);
		}
		else
		{
			message[1] = (byte)127;
			message[2] = (byte)((payloadLength>>56)&0xff);
			message[3] = (byte)((payloadLength>>48)&0xff);
			message[4] = (byte)((payloadLength>>40)&0xff);
			message[5] = (byte)((payloadLength>>32)&0xff);
			message[6] = (byte)((payloadLength>>24)&0xff);
			message[7] = (byte)((payloadLength>>16)&0xff);
			message[8] = (byte)((payloadLength>>8)&0xff);
			message[9] = (byte)(payloadLength&0xff);
		}

		//copy the data and send it
		System.arraycopy(msg, 0, message, headerLength, msg.length);		
		try
		{
			m_outputStream.write(message);
			m_outputStream.flush();
		}
		catch(Exception e)
		{
			return false;
		}
		return true;
	}
	
	private java.net.Socket m_socket = null;
	private java.io.InputStream m_inputStream = null;
	private java.io.OutputStream m_outputStream = null;
	private Type m_type = Type.Invalid;
	private Format m_format = Format.Invalid;
	private String m_identifier = null;
	static private String m_guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	static private int m_timeOut = 10000;
}

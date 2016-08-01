import java.awt.Color;
import java.io.Console;

import javax.swing.BorderFactory;

public class BeingThereOperator
{
	static boolean continueRunning = true;
	static javax.swing.JList displayList = null;
	static javax.swing.JList cameraList = null;
	static javax.swing.JList connectionList = null;
	static javax.swing.DefaultListModel<Client> displayListContainer = null;
	static javax.swing.DefaultListModel<Client> cameraListContainer = null;
	static javax.swing.DefaultListModel<Tuple<Client,Client>> connectionListContainer = null;
	
	public static void main(String[] args) 
	{
		//initialize the server
		System.out.println("Starting server...");
		int port = 4862;
		java.net.ServerSocket serverSocket = null;
		try
		{
			serverSocket = new java.net.ServerSocket(port);
			serverSocket.setSoTimeout(100);
		}
		catch(Exception e)
		{
			System.out.println("Could not create the server socket");
			return;
		}
		
		//create the containers
		displayListContainer = new javax.swing.DefaultListModel<Client>();
		cameraListContainer = new javax.swing.DefaultListModel<Client>();
		connectionListContainer = new javax.swing.DefaultListModel<Tuple<Client,Client>>();
		
		//create the lists and buttons
		displayList = new javax.swing.JList(displayListContainer);
		displayList.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
		cameraList = new javax.swing.JList(cameraListContainer);
		cameraList.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
		connectionList = new javax.swing.JList(connectionListContainer);
		connectionList.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
		
		javax.swing.JButton connectButton = new javax.swing.JButton("Connect");
		javax.swing.JButton disconnectButton = new javax.swing.JButton("Disonnect");
		
		//create for the connection side the split panels
		javax.swing.JSplitPane connectionListSplitPane = new javax.swing.JSplitPane(javax.swing.JSplitPane.HORIZONTAL_SPLIT,cameraList,displayList);
		javax.swing.JSplitPane connectionListButtonSplitPane = new javax.swing.JSplitPane(javax.swing.JSplitPane.VERTICAL_SPLIT,connectionListSplitPane, connectButton);
		
		//create for the disconnection side the split panels
		javax.swing.JSplitPane disconnectionListButtonSplitPane = new javax.swing.JSplitPane(javax.swing.JSplitPane.VERTICAL_SPLIT,connectionList, disconnectButton);
		
		//create the splitplane for the main frame
		javax.swing.JSplitPane mainFrameSplitPane = new javax.swing.JSplitPane(javax.swing.JSplitPane.HORIZONTAL_SPLIT,connectionListButtonSplitPane, disconnectionListButtonSplitPane);
		
		//format the gui
		connectionListSplitPane.setDividerLocation(200);
		connectionListSplitPane.setDividerSize(3);
		connectionListSplitPane.setEnabled(false);
		connectionListButtonSplitPane.setDividerLocation(500);
		connectionListButtonSplitPane.setDividerSize(3);
		connectionListButtonSplitPane.setEnabled(false);
		disconnectionListButtonSplitPane.setDividerLocation(500);
		disconnectionListButtonSplitPane.setDividerSize(3);
		disconnectionListButtonSplitPane.setEnabled(false);
		mainFrameSplitPane.setDividerLocation(400);
		mainFrameSplitPane.setDividerSize(3);
		mainFrameSplitPane.setEnabled(false);
		
		//create the main frame
		javax.swing.JFrame mainFrame = new javax.swing.JFrame("Operator");
		mainFrame.setSize(800,600);
		mainFrame.setLocation(200,200);
		mainFrame.addWindowListener(new java.awt.event.WindowListener() {
            public void windowClosed(java.awt.event.WindowEvent arg0){}
            public void windowActivated(java.awt.event.WindowEvent arg0){}
            public void windowClosing(java.awt.event.WindowEvent arg0){continueRunning=false;}
            public void windowDeactivated(java.awt.event.WindowEvent arg0){}
            public void windowDeiconified(java.awt.event.WindowEvent arg0){}
            public void windowIconified(java.awt.event.WindowEvent arg0){}
            public void windowOpened(java.awt.event.WindowEvent arg0){}
        });
		javax.swing.JPanel contentPanel = (javax.swing.JPanel) mainFrame.getContentPane();
		contentPanel.add(mainFrameSplitPane);		
		mainFrame.setVisible(true);
		
		//register a popupmenu
		connectionList.addMouseListener(new java.awt.event.MouseAdapter() {
	        public void mousePressed(java.awt.event.MouseEvent e) {
	        	if (e.getButton()==3 && connectionList.locationToIndex(e.getPoint())>=0) {
	            	javax.swing.JPopupMenu menu = new javax.swing.JPopupMenu();
	            	javax.swing.JMenuItem item = new javax.swing.JMenuItem("Show");
	                item.addActionListener(new java.awt.event.ActionListener(){
	                    public void actionPerformed(java.awt.event.ActionEvent e)
	                    {
	                    	Client a = (Client)(((Tuple<Client,Client>)connectionList.getSelectedValue()).x);
							Client b = (Client)(((Tuple<Client,Client>)connectionList.getSelectedValue()).y);
							b.show(a);
	                    }
	                });
	                menu.add(item);
	                connectionList.setSelectedIndex(connectionList.locationToIndex(e.getPoint()));
	                menu.show(connectionList, e.getX(), e.getY());
	            }
	        }
	    });
		
		
		//register callbacks
		connectButton.addActionListener(
				new java.awt.event.ActionListener()
				{	 
					public void actionPerformed(java.awt.event.ActionEvent e)
					{
						//check if we have two connections
						if(displayList.getSelectedIndex()>=0 && cameraList.getSelectedIndex()>=0)
						{
							Client a = (Client)cameraList.getSelectedValue();
							Client b = (Client)displayList.getSelectedValue();
							if(a==null||b==null)
							{
								System.out.println("Invalid selection: one or the other element is null!");
								return;
							}
							
							byte[] offer = a.getOffer(b);
							if(offer==null)
							{
								System.out.println("Could not get an offer from " + a.getIdentifier() + "!");
								return;
							}
							byte[] answer = b.getAnswer(a,offer);
							if(answer==null)
							{
								System.out.println("Could not get an answer from " + b.getIdentifier() + "!");
								return;
							}
							if(!a.setAnswer(b, answer))
							{
								System.out.println("Could not set an answer to " + a.getIdentifier() + "!");
								return;
							}
							connectionListContainer.addElement(new Tuple<Client, Client>(a,b));
						}
						else
						{
							System.out.println("Invalid selection: select one display and one camera!");
						}
					}
				}
		);
		disconnectButton.addActionListener(
				new java.awt.event.ActionListener()
				{	 
					public void actionPerformed(java.awt.event.ActionEvent e)
					{
						//check if we have two connections
						if(connectionList.getSelectedIndex()>=0)
						{
							Client a = (Client)(((Tuple<Client,Client>)connectionList.getSelectedValue()).x);
							Client b = (Client)(((Tuple<Client,Client>)connectionList.getSelectedValue()).y);
							if(a!=null&&b!=null)
							{
								a.disconnect(b);
								b.disconnect(a);
								connectionListContainer.removeElementAt(connectionList.getSelectedIndex());
							}
							else
							{
								System.out.println("Invalid selection: one or the other element is null!");
							}
						}
						else
						{
							System.out.println("Invalid selection: select one display and one camera!");
						}
					}
				}
		);
		
		//start accept loop
		while(continueRunning)
		{
			//accept a new socket but with finite timeout
			java.net.Socket socket = null;
			try
			{
				socket = serverSocket.accept();
				if(socket!=null)
				{
					Client newClient = new Client(socket);
					if(newClient.isConnectedAndValid())
					{
						if(newClient.getType()==Client.Type.Display)
						{
							synchronized(displayListContainer)
							{
								displayListContainer.addElement(newClient);
							}
						}
						else if(newClient.getType()==Client.Type.Camera)
						{
							synchronized(cameraListContainer)
							{
								cameraListContainer.addElement(newClient);
							}
						}
					}
				}
			}
			catch(Exception e)
			{
				socket = null;
			}
			
			//clean up the lists
			synchronized(displayListContainer)
			{
				for(int i = 0; i < displayListContainer.size(); i++)
				{
					if(!displayListContainer.elementAt(i).isConnectedAndValid())
					{
						displayListContainer.elementAt(i).close();
						displayListContainer.removeElementAt(i);
						i--;
					}
				}
			}
			synchronized(cameraListContainer)
			{
				for(int i = 0; i < cameraListContainer.size(); i++)
				{
					if(!cameraListContainer.elementAt(i).isConnectedAndValid())
					{
						cameraListContainer.elementAt(i).close();
						cameraListContainer.removeElementAt(i);
						i--;
					}
				}
			}
			
			//check if either element in the connected list is disconnected and remove then both after disconnecting
			synchronized(connectionListContainer)
			{
				for(int i = 0; i < connectionListContainer.size(); i++)
				{
					if(!connectionListContainer.elementAt(i).x.isConnectedAndValid() || !connectionListContainer.elementAt(i).y.isConnectedAndValid())
					{
						connectionListContainer.elementAt(i).x.disconnect(connectionListContainer.elementAt(i).y);
						connectionListContainer.elementAt(i).y.disconnect(connectionListContainer.elementAt(i).x);
						connectionListContainer.removeElementAt(i);
						i--;
					}
				}
			}
		}
		
		//close the server
		try
		{
			serverSocket.close();
		}
		catch(Exception e){}
		System.out.println("Quitting...");
		System.exit(0);
	}
}

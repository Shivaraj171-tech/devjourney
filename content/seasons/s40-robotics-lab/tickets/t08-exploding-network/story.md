**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-108: The loss went to infinity

Last one, and my favourite. 🧠 Instead of the law of cosines, a tiny neural network (`grabby/mlp.py`, written from scratch) learns inverse kinematics from examples: box position in, joint angles out.
Byte set up the training in `grabby/ik_net.py`: the camera's positions in centimetres go straight in, with a learning rate of 0.5. After 100 updates the loss is 10^105, then it's `nan`, and Grabby points at the ceiling.
Make training stable so the loss falls below 0.01 and the network reaches boxes it has never seen. The Lab viewer plots the loss on a log scale and shows the arm reaching with the network's angles.

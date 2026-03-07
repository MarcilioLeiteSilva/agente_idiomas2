
import unittest
import sys
import os

sys.path.append(r'C:\Users\Win11_001\Desktop\agente_idiomas2')
import tests.test_phase1_step9

if __name__ == '__main__':
    with open('test_result.txt', 'w') as f:
        runner = unittest.TextTestRunner(stream=f, verbosity=2)
        unittest.main(module='tests.test_phase1_step9', testRunner=runner, exit=False)

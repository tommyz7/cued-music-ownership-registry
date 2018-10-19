pipeline {
    agent {
        docker {
            image 'music-smart-contracts'
            args '-p 3000:3000'
        }
    }
    environment {
        CI = 'ture'
    }
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t music-smart-contracts .'
            }
        }
        stage('Test') {
            steps {

            }
        }
        stage('Deliver') {
            steps {

            }
        }
    }
}

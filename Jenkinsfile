pipeline {
    agent any
    environment {
        CI = 'true'
    }
    stages {
        stage('Run unit & integration tests') {
            steps {
                sh 'docker-compose -f compose/test.yml build'
                sh 'docker-compose -f compose/test.yml up -d'
                sh 'docker attach compose_truffle_1'
            }
        }
        stage('Compile, deploy and publish to npm') {
            steps {
                sh 'docker-compose -f compose/deploy.yml build'
                sh 'docker-compose -f compose/deploy.yml up -d'
                sh 'docker attach compose_truffle_1'
            }
        }
        stage('Create java classes') {
            steps {
                echo 'TODO'
            }
        }
        stage('Publish java classes to maven') {
            steps {
                echo 'TODO'
            }
        }
        stage('Clean up docker images') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }
}

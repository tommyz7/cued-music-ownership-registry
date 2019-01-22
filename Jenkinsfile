pipeline {
    agent any
    environment {
        CI = 'true'
    }
    stages {
        stage('Run unit & integration tests') {
            steps {
                echo 'TODO'
            }
        }
        stage('Build and compile for npm') {
            agent {
                dockerfile {
                    filename 'compose/production/nexus/npm/Dockerfile'
                    additionalBuildArgs '-t cued-sc'
                }
            }
            steps {
                echo 'Built docker and compiled smart contracts'
            }
        }
        stage('Publish "builds" to npm') {
            steps {
                sh 'docker run --rm cued-sc'
            }
        }
        stage('Create java classes from solidity') {
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

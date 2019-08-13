pipeline {
    agent any

    environment {
        CI = 'true'
        branch = "${env.BRANCH_NAME}"
        gitCommit = "${env.GIT_COMMIT}"
    }

    stages {
        stage('Install Docker Compose') {
            steps {
                sh 'sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose'
                sh 'sudo chmod +x /usr/local/bin/docker-compose'
            }
        }
        stage('Run unit & integration tests') {
            steps {
                sh 'whereis docker-compose'
                sh '/usr/local/bin/docker-compose -f compose/docker-eth-env.yml build'
                sh '/usr/local/bin/docker-compose -f compose/docker-eth-env.yml run --rm truffle npm run test_local'
                sh '/usr/local/bin/docker-compose -f compose/docker-eth-env.yml kill ganache-cli'
            }
        }
        stage('Publish to npm') {
            steps {
                sh '/usr/local/bin/docker-compose -f compose/docker-eth-env.yml build'
                sh '/usr/local/bin/docker-compose -f compose/docker-eth-env.yml run --rm truffle npm run publish'
                sh '/usr/local/bin/docker-compose -f compose/docker-eth-env.yml kill ganache-cli'
            }
        }
        stage('Create ganache-cli with deployed contracts') {
            steps {
                // sh 'docker build -t cued-blockchain -f compose/ganache/Dockerfile .'
                echo "Building docker $branch"
                script {
                    image = docker.build("cued_blockchain:$branch-$gitCommit", "compose/ganache/Dockerfile")
                    docker.withRegistry("https://registry.coreum.io/", "docker-registry") {
                        image.push()
                        image.push("$branch")
                    }
                }
            }
        }
    }
}
